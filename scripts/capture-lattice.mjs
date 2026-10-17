// Capture the Lattice catalog screenshot from its live Pages deployment.
// Usage: node scripts/capture-lattice.mjs [url]
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const url = process.argv[2] ?? "https://siriusctrl.github.io/lattice/";
const output = path.join(process.cwd(), "public", "media", "lattice.webp");
const workDir = mkdtempSync(path.join(tmpdir(), "lattice-capture-"));
const rawPath = path.join(workDir, "lattice.png");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^SpaceX：/ }).click();
  await page.getByRole("button", { name: /^第四次 Falcon 1 发射/ }).waitFor();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: rawPath });
} finally {
  await browser.close();
}

const encode = spawnSync("ffmpeg", [
  "-y", "-loglevel", "error", "-i", rawPath,
  "-vf", "scale=1600:1000:flags=lanczos",
  "-c:v", "libwebp", "-quality", "86", "-compression_level", "6",
  output,
], { stdio: "inherit" });
rmSync(workDir, { recursive: true, force: true });
if (encode.status !== 0) process.exit(encode.status ?? 1);
console.log(`Lattice capture: ${output}`);
