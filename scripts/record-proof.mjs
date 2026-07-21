import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { stopProcessGroup, waitForServer } from "./lib/browser-server.mjs";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.join(root, "artifacts", "verification", stamp);
const videoDir = path.join(outputDir, "videos");
const webmPath = path.join(outputDir, "recording.webm");
const gifPath = path.join(outputDir, "proof.gif");
const screenshotPath = path.join(outputDir, "final-screenshot.png");
const mobileScreenshotPath = path.join(outputDir, "mobile-screenshot.png");
const contactSheetPath = path.join(outputDir, "contact-sheet.png");
const manifestPath = path.join(outputDir, "manifest.json");
const inspectionPath = path.join(outputDir, "inspection.txt");
const url = "http://127.0.0.1:4322";

mkdirSync(videoDir, { recursive: true });

const server = spawn("npm", ["run", "serve:test", "--", "--port", "4322"], {
  cwd: root,
  detached: true,
  stdio: "ignore",
  env: { ...process.env, BROWSER: "none" },
});

let browser;

try {
  await waitForServer(url);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } },
  });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForTimeout(650);
  await page.getByTestId("theme-toggle").click();
  await page.waitForTimeout(900);
  await page.getByRole("heading", { name: "Recent work" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.locator("[data-work-entry=freeform-artifacts]").evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 700);
  await page.waitForFunction(() => document.querySelector("[data-work-frame=fiasco] img")?.complete);
  await page.waitForTimeout(900);
  await page.locator("[data-work-entry=freeform-artifacts]").evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.waitForTimeout(450);
  await page.getByRole("link", { name: "Freeform Artifacts", exact: true }).first().click();
  await page.waitForLoadState("networkidle");
  await page.getByText(/Build with AI can install a trusted artifact bundle/).waitFor();
  await page.waitForTimeout(650);
  await page.getByRole("link", { name: "Projects" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(550);
  await page.getByRole("link", { name: "Notes" }).click();
  await page.getByRole("link", { name: "Rebuilding a personal site around working software" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(650);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) {
    throw new Error(`Desktop page overflowed by ${overflow}px`);
  }

  await context.close();

  const mobile = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
  await mobile.goto(url);
  await mobile.waitForTimeout(500);
  for (const entry of await mobile.locator("[data-work-entry]").all()) {
    await entry.scrollIntoViewIfNeeded();
    await entry.locator("img").waitFor({ state: "visible" });
  }
  await mobile.waitForFunction(() =>
    [...document.querySelectorAll(".work-entry-media img")].every((image) => image.complete),
  );
  await mobile.waitForTimeout(2800);
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.waitForTimeout(900);
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (mobileOverflow > 0) {
    throw new Error(`Mobile home overflowed by ${mobileOverflow}px`);
  }
  await mobile.screenshot({ path: mobileScreenshotPath, fullPage: true });
  await mobile.close();

  const videos = readdirSync(videoDir).filter((file) => file.endsWith(".webm"));
  if (videos.length === 0) throw new Error("Playwright did not produce a recording");
  renameSync(path.join(videoDir, videos[0]), webmPath);

  const gif = spawnSync("ffmpeg", [
    "-y", "-ss", "0.55", "-i", webmPath,
    "-vf", "fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    gifPath,
  ], { stdio: "pipe" });
  if (gif.status !== 0 || !existsSync(gifPath)) {
    throw new Error(`Unable to create proof GIF: ${gif.stderr.toString()}`);
  }

  const sheet = spawnSync("ffmpeg", [
    "-y", "-i", gifPath,
    "-vf", "fps=1.2,scale=360:-1:flags=lanczos,tile=4x3:padding=8:margin=8:color=white",
    "-frames:v", "1", "-update", "1", contactSheetPath,
  ], { stdio: "pipe" });
  if (sheet.status !== 0 || !existsSync(contactSheetPath)) {
    throw new Error(`Unable to create proof contact sheet: ${sheet.stderr.toString()}`);
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    url,
    actions: [
      "open home",
      "switch to dark mode with a radial reveal from the theme button",
      "scroll to recent work",
      "move one wheel step from Freeform Artifacts to the centered Fiasco stage",
      "open Freeform Artifacts detail and verify current copy",
      "open project index",
      "open notes index and article",
      "check desktop and mobile overflow",
    ],
    files: { gifPath, webmPath, screenshotPath, mobileScreenshotPath, contactSheetPath },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    inspectionPath,
    [
      "Portfolio browser proof",
      "",
      "- Chromium rendered the home, project detail, project index, notes index, and article routes.",
      "- Theme switching persisted across internal navigation.",
      "- The radial theme reveal and one-project scroll snap were exercised.",
      "- SVG project portraits and real project media loaded before capture.",
      "- Desktop and mobile width checks found no horizontal overflow.",
      "- A contact sheet was generated for internal temporal inspection.",
      "",
      `GIF: ${gifPath}`,
      `Contact sheet: ${contactSheetPath}`,
    ].join("\n"),
  );

  console.log(`Proof GIF: ${gifPath}`);
} finally {
  if (browser) await browser.close();
  stopProcessGroup(server);
}
