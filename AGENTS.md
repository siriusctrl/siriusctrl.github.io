# AGENTS.md

## Source map

- `src/pages/`: route entrypoints for home, projects, notes, RSS, and compatibility redirects.
- `src/layouts/BaseLayout.astro`: document metadata, global assets, theme initialization, and shared shell.
- `src/components/`: small presentational site components.
- `src/data/projects.ts`: curated public project catalog and links.
- `src/content/notes/`: public Markdown/MDX notes.
- `src/styles/global.css`: site tokens, responsive layout, motion, and article typography.
- `public/media/`: real screenshots captured from the represented projects.
- `scripts/`: media capture and browser-proof workflows.
- `tests/`: Playwright behavior and responsive-layout coverage.
- `docs/architecture-decisions.md`: product and implementation trade-offs.
- `.github/workflows/pages.yml`: production GitHub Pages build and deploy.

## Engineering invariants

- Keep the site statically buildable. Do not add a server runtime for catalog or note features.
- Keep interactive demos in their own repositories; link to their Pages deployments from this catalog.
- Use real screenshots or recordings from project runtimes. Do not recreate terminal products as fake browser UI.
- Keep project metadata curated. Do not turn the home page into an automatic dump of GitHub repositories.
- Preserve published note and project routes, or add explicit redirects when a slug changes.
- Support desktop/mobile and light/dark modes together.
- Do not commit generated `dist/`, test output, or local verification artifacts.

## Task routing

- New project or copy change: start in `src/data/projects.ts` and the matching media file.
- New article: add `src/content/notes/<slug>.md` or `.mdx` with validated frontmatter.
- Site-wide visual change: read `src/styles/global.css`, then verify home, project index, one detail page, and one note.
- Deployment change: read the official Astro/GitHub Pages docs and inspect `.github/workflows/pages.yml`.
- Project media update: run the source project's own verification recorder when one exists; use `scripts/capture-towerlab.sh` for TowerLab.

## Verification

Run the smallest relevant checks, then the full browser pass before publishing:

```sh
npm run check
npm run verify:ui
npm run verify:proof
```

Inspect desktop/mobile screenshots and the proof contact sheet. A successful build alone does not prove layout, navigation, theme, or image quality.

## Documentation updates

- Update `README.md` when setup, publishing, content ownership, or verification commands change.
- Add or revise an ADR when a hosting boundary, content model, deployment model, or major dependency decision changes.
- Keep this file operational. Product explanation belongs in `README.md` or `docs/`.

## Commit rules

- Use focused Conventional Commit messages.
- Keep generated media updates in the same commit as the project metadata that consumes them.
- Never remove historical site content without preserving a route or documenting the intentional break.
