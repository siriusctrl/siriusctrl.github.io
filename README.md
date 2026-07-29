# siriusctrl.github.io

Source for [siriusctrl.github.io](https://siriusctrl.github.io), a static working set of ideas expressed through software and writing.

The site is intentionally split by ownership:

- this repository owns the home page, software catalog, detail pages, and Markdown writing;
- interactive demos deploy from their own repositories and release independently;
- terminal projects are represented with images captured from real emulator sessions;
- GitHub Actions builds Astro and deploys only the generated `dist/` artifact to Pages.

## Prerequisites

- Node.js 22.12 or newer (the pinned version is in `.nvmrc`).
- Chromium for browser verification: `npm run setup:browsers`.
- ffmpeg for generating the GIF and contact sheet produced by `verify:proof`.

## Local development

```sh
npm install
npm run dev
```

The default development URL is `http://localhost:4321/`.

## Content

- Add or revise projects in `src/data/projects.ts`.
- Add public writing under `src/content/notes/` as Markdown or MDX.
- Give every article a stable `translationKey` and `language`.
- Keep the default English article at the existing path and place Chinese translations under `src/content/notes/zh/`.
- Add a curated article portrait with `artwork` and localized `artworkAlt` when the idea benefits from a visual model.
- Keep project media under `public/media/` and use real product output.
- Use `scripts/capture-towerlab.sh` to refresh the TowerLab terminal capture.

## Verification

```sh
npm run check
npm run verify:ui
npm run verify:proof
```

`verify:proof` records a real Chromium session, produces a GIF for handoff, and generates internal screenshot/contact-sheet evidence under `artifacts/verification/`.

## Publishing

Pushes to `master` run `.github/workflows/pages.yml`. The workflow uses Astro's official Pages action and publishes the generated static artifact without committing `dist/`.

The previous Hexo-generated site is preserved on the `archive/hexo-2023` branch.

## Current scope

- Freeform Artifacts as the primary interactive demo.
- Lattice as a graph-native AI research workspace with its own Pages deployment.
- Fiasco as the multi-agent orchestration and background-job runtime.
- TowerLab, fmtview, and termviz as selected terminal projects.
- English and Chinese Markdown/MDX writing, RSS, sitemap, detail pages, and responsive light/dark presentation.
