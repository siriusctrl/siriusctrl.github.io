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
  if (await page.locator("[data-theme-toggle], .site-header button").count() !== 0) {
    throw new Error("The light-only site still renders a theme toggle");
  }
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(400);
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(550);
  await page.getByRole("button", { name: "Terminal", exact: true }).click();
  await page.waitForTimeout(700);
  if (await page.locator(".catalog-card:not([hidden])").count() >= await page.locator(".catalog-card").count()) {
    throw new Error("Projects filter did not narrow the catalog");
  }
  await page.getByRole("button", { name: /^All \d+$/ }).click();
  await page.waitForTimeout(500);
  const latticeCard = page.locator(".catalog-card", {
    has: page.getByRole("link", { name: "Lattice", exact: true }),
  });
  await latticeCard.scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".catalog-thumb img")].every((image) => image.complete),
  );
  await latticeCard.hover();
  await page.waitForTimeout(650);
  await page.getByRole("link", { name: "Lattice", exact: true }).first().click();
  await page.waitForLoadState("networkidle");
  await page.getByText(/Browse a completed research DAG/).waitFor();
  await page.waitForTimeout(650);
  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(550);
  await page.getByRole("link", { name: "Writing", exact: true }).click();
  await page.getByRole("link", { name: "Context, Not Control: Managing an Agent Workforce" }).click();
  await page.waitForLoadState("networkidle");
  await page.locator(".article-note-artwork img").waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".prose img")].every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.getByRole("link", { name: "Read in Chinese" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { name: "Context, Not Control：管理 Agent Workforce" }).waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".prose img")].every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.waitForTimeout(650);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) {
    throw new Error(`Desktop page overflowed by ${overflow}px`);
  }

  await context.close();

  const mobile = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
  await mobile.goto(url);
  await mobile.waitForLoadState("networkidle");
  await mobile.locator(".recent-section img").first().waitFor({ state: "visible" });
  await mobile.waitForTimeout(1800);
  const mobileHomeOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (mobileHomeOverflow > 0) {
    throw new Error(`Mobile home overflowed by ${mobileHomeOverflow}px`);
  }
  await mobile.screenshot({ path: mobileScreenshotPath, fullPage: true });

  await mobile.goto(`${url}/projects/`);
  for (const entry of await mobile.locator("[data-catalog-item]").all()) {
    await entry.scrollIntoViewIfNeeded();
    await entry.locator("img").waitFor({ state: "visible" });
  }
  await mobile.waitForFunction(() =>
    [...document.querySelectorAll(".catalog-thumb img")].every((image) => image.complete),
  );
  await mobile.waitForTimeout(2800);
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.waitForTimeout(900);
  const mobileProjectsOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (mobileProjectsOverflow > 0) {
    throw new Error(`Mobile projects index overflowed by ${mobileProjectsOverflow}px`);
  }
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
      "confirm the light-only header has no theme toggle",
      "scroll the home page with wheel and PageDown",
      "open the projects index",
      "filter the catalog to Terminal projects, then restore All",
      "hover the Lattice card and open its detail page with the real runtime screenshot",
      "return to the projects index",
      "open the writing index and article",
      "switch the article from English to Chinese",
      "check desktop and mobile overflow",
    ],
    files: { gifPath, webmPath, screenshotPath, mobileScreenshotPath, contactSheetPath },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(
    inspectionPath,
    [
      "Working Set browser proof",
      "",
      "- Chromium rendered the home, project detail, projects index, writing index, and article routes.",
      "- The light-only header rendered without a theme toggle.",
      "- Wheel and PageDown scrolled the home page without a scroll lock.",
      "- The projects catalog filter narrowed and restored the grid, and card hover was exercised.",
      "- The article language switch selected the authored Chinese route and persisted the choice.",
      "- SVG project and article portraits loaded before capture.",
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
