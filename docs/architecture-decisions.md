# Architecture decisions

## ADR-0001: Keep source and Pages deployment in the user-site repository

Status: accepted

### Context

The previous site committed generated Hexo output directly to `master`. The new site needs normal source code, public Markdown notes, project metadata, agent guidance, and reproducible verification.

### Decision

Use `siriusctrl.github.io` as the source repository. GitHub Actions builds Astro and publishes only the `dist/` artifact through GitHub Pages.

### Why

- `AGENTS.md`, documentation, tests, and source history stay beside the site.
- There is no second repository or generated branch to synchronize.
- A source commit maps directly to a Pages deployment.
- The old generated site remains available on `archive/hexo-2023`.

### Trade-offs

- A failed site build blocks publishing until CI is fixed.
- Repository history contains a deliberate transition from generated output to source.

## ADR-0002: Use Astro for the portfolio and notes

Status: accepted

### Context

Most pages are static, while the site still needs Markdown/MDX, RSS, sitemap generation, reusable layouts, and a small color-mode interaction.

### Decision

Use Astro's static output with content collections. Keep browser JavaScript limited to the theme toggle and verification hooks.

### Why

- The content model is explicit and validated.
- Notes produce static HTML with no client framework runtime.
- GitHub Pages deployment is supported by Astro's official action.
- Interactive products remain external instead of inflating the portfolio bundle.

### Trade-offs

- Astro is an additional toolchain compared with handwritten HTML.
- Major Astro upgrades require checking integration compatibility before updating.

## ADR-0003: Deploy interactive demos independently

Status: accepted

### Context

Freeform is an interactive browser application. TowerLab, fmtview, and termviz are terminal products. Their release cadence and verification needs differ from the portfolio.

### Decision

Deploy browser demos from their own repositories as GitHub project Pages sites. The portfolio stores curated metadata and real media, then links to the demo and source repository.

### Why

- A note edit does not rebuild a demo.
- A demo release does not require copying build output into this repository.
- Project-specific CI and proof workflows remain close to the product.
- Terminal tools can be shown honestly through emulator captures instead of fake Web interfaces.

### Trade-offs

- The catalog must keep external links and media current.
- Project Pages applications must handle their repository base path correctly.

## ADR-0004: Curate the project index manually

Status: accepted

### Context

The GitHub account contains experiments, course work, forks, private repositories, and projects that are not useful on a public portfolio.

### Decision

Keep the selected project catalog in `src/data/projects.ts`. Do not automatically list every repository.

### Why

- Selection and ordering express product judgment.
- Copy and media can explain why each project matters.
- The site remains concise as the GitHub account grows.

### Trade-offs

- New projects require a small manual catalog update.
- Repository metadata such as stars and latest commits is not shown automatically.

## ADR-0005: Use real runtime evidence as project media

Status: accepted

### Context

CLI and TUI software does not benefit from a browser-shaped imitation. The site needs visual evidence that remains legible, attractive, and grounded in actual behavior.

### Decision

Capture terminal projects in real Kitty/Xvfb sessions and extract stable keyframes. Use the Freeform browser proof screenshot for its project media.

### Why

- Visitors see the actual product surface.
- Media creation doubles as a lightweight visual smoke test.
- Captures can be refreshed from deterministic fixtures and seeds.

### Trade-offs

- Media updates require the corresponding runtime and capture tools.
- Static images cannot demonstrate every interaction; repositories retain full proof recordings.
