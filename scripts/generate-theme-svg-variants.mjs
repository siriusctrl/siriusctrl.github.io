import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const mediaDirectories = [
  path.join(root, "public", "media", "portraits"),
  path.join(root, "public", "media", "notes"),
];
const rootPalettePattern = /:root\s*\{([^}]+)\}/;
const darkPalettePattern =
  /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{\s*:root\s*\{([^}]+)\}\s*\}/;

for (const directory of mediaDirectories) {
  const filenames = (await readdir(directory))
    .filter((filename) =>
      filename.endsWith(".svg")
      && !filename.endsWith("-light.svg")
      && !filename.endsWith("-dark.svg")
    )
    .sort();

  for (const filename of filenames) {
    const sourcePath = path.join(directory, filename);
    const source = await readFile(sourcePath, "utf8");
    const lightPalette = source.match(rootPalettePattern)?.[1];
    const darkPalette = source.match(darkPalettePattern)?.[1];
    if (!lightPalette || !darkPalette) {
      throw new Error(
        `${path.relative(root, sourcePath)} must define light :root variables and a dark color-scheme palette`,
      );
    }

    const withoutColorScheme = source
      .replace(darkPalettePattern, "")
      .replace(/[ \t]+$/gm, "");
    const stem = filename.slice(0, -".svg".length);
    for (const [theme, palette] of [["light", lightPalette], ["dark", darkPalette]]) {
      const variant = withoutColorScheme.replace(rootPalettePattern, `:root{${palette}}`);
      const variantPath = path.join(directory, `${stem}-${theme}.svg`);
      if (checkOnly) {
        let existing;
        try {
          existing = await readFile(variantPath, "utf8");
        } catch {
          throw new Error(
            `${path.relative(root, variantPath)} is missing; run npm run generate:theme-svg`,
          );
        }
        if (existing !== variant) {
          throw new Error(
            `${path.relative(root, variantPath)} is stale; run npm run generate:theme-svg`,
          );
        }
      } else {
        await writeFile(variantPath, variant);
      }
    }
  }
}
