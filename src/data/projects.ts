export interface Project {
  slug: string;
  name: string;
  kind: "Interactive lab" | "Agent orchestrator" | "Terminal game" | "CLI tool";
  summary: string;
  detail: string;
  year: string;
  stack: string[];
  portrait: string;
  portraitAlt: string;
  image: string;
  imageAlt: string;
  repoUrl: string;
  demoUrl?: string;
  install?: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    slug: "freeform-artifacts",
    name: "Freeform Artifacts",
    kind: "Interactive lab",
    summary: "A local-first spatial canvas for arranging and generating data-backed artifacts with AI.",
    detail:
      "Create multiple named canvases, then drag, resize, pan, zoom, and snap tables, metrics, flows, and managed charts into place. Build with AI can install a trusted artifact bundle directly into the selected view; every visitor's edits remain isolated and persist in their own browser without an account or backend.",
    year: "2026",
    stack: ["React", "TypeScript", "Chart Kit / ECharts", "IndexedDB"],
    portrait: "/media/portraits/freeform-artifacts.svg",
    portraitAlt: "Minimal drawing of three data artifacts aligning on a spatial canvas",
    image: "/media/freeform-artifacts.webp",
    imageAlt: "Dark-mode Freeform Artifacts canvas showing metric, probability, pipeline, Sankey, and table artifacts",
    repoUrl: "https://github.com/siriusctrl/freeform-artifacts",
    demoUrl: "https://siriusctrl.github.io/freeform-artifacts/",
    featured: true,
  },
  {
    slug: "fiasco",
    name: "Fiasco",
    kind: "Agent orchestrator",
    summary: "Orchestrate the agents. Contain the fiasco.",
    detail:
      "A headless Rust orchestrator for multiple agents and background jobs. One durable runtime coordinates root and delegated agents, concurrent tool calls, and long-running background jobs with resumable run directories, streaming model providers, skills, MCP, hooks, artifacts, and file-backed memory.",
    year: "2026",
    stack: ["Rust", "Multi-agent orchestration", "Background jobs", "MCP"],
    portrait: "/media/portraits/fiasco.svg",
    portraitAlt: "Minimal runtime trace of a root agent delegating child agents and background jobs into a durable run directory",
    image: "/media/portraits/fiasco.svg",
    imageAlt: "Fiasco orchestration trace showing delegated agents, background jobs, and durable run artifacts",
    repoUrl: "https://github.com/siriusctrl/fiasco",
    install: "cargo install --git https://github.com/siriusctrl/fiasco",
  },
  {
    slug: "towerlab",
    name: "TowerLab",
    kind: "Terminal game",
    summary: "A deterministic terminal deckbuilder for humans and planning agents.",
    detail:
      "A playable three-act roguelike with character-specific card pools, route decisions, scripted enemies, replayable seeds, and a headless JSON control surface.",
    year: "2026",
    stack: ["TypeScript", "Ink", "Deterministic engine", "Agent API"],
    portrait: "/media/portraits/towerlab.svg",
    portraitAlt: "Minimal drawing of one selected card resolving into a highlighted deterministic route",
    image: "/media/towerlab.webp",
    imageAlt: "TowerLab running inside a terminal with cards, enemy intent, and combat log",
    repoUrl: "https://github.com/siriusctrl/towerlab",
    install: "git clone https://github.com/siriusctrl/towerlab",
  },
  {
    slug: "fmtview",
    name: "fmtview",
    kind: "CLI tool",
    summary: "Fast structured-file viewing, search, highlighting, and diffing in the terminal.",
    detail:
      "Viewer-first handling for JSON, JSONL, XML, HTML, Markdown, TOML, text, and Jinja, with bounded loading paths for large files and scriptable redirected output.",
    year: "2026",
    stack: ["Rust", "Ratatui", "Lazy loading", "Structured diff"],
    portrait: "/media/portraits/fmtview.svg",
    portraitAlt: "Minimal drawing of raw rows becoming an indented structure with one visible search match",
    image: "/media/fmtview.webp",
    imageAlt: "fmtview terminal interface displaying highlighted structured data",
    repoUrl: "https://github.com/siriusctrl/fmtview",
    install: "cargo install fmtview --locked",
  },
  {
    slug: "termviz",
    name: "termviz",
    kind: "CLI tool",
    summary: "Terminal-first image and plot viewing with interactive and scriptable output.",
    detail:
      "Open raster images, SVG, CSV, TSV, or JSONL from the shell. Interactive terminals get pan, zoom, metadata, and plot inspection while redirected output stays predictable.",
    year: "2026",
    stack: ["Rust", "Kitty protocol", "ANSI fallback", "Plot engine"],
    portrait: "/media/portraits/termviz.svg",
    portraitAlt: "Minimal drawing of two plotted series with one focused inspection window",
    image: "/media/termviz.webp",
    imageAlt: "termviz rendering a multi-series latency plot in a real terminal emulator",
    repoUrl: "https://github.com/siriusctrl/termviz",
    install: "cargo install --git https://github.com/siriusctrl/termviz",
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
