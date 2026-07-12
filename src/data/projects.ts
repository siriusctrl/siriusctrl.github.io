export interface Project {
  slug: string;
  name: string;
  kind: "Interactive lab" | "Terminal game" | "CLI tool";
  summary: string;
  detail: string;
  year: string;
  stack: string[];
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
    summary: "A browser canvas for arranging AI-generated, data-backed artifacts.",
    detail:
      "Drag, resize, pan, and zoom a working dashboard canvas. Every visitor starts from the same published template, then edits an isolated copy saved in their own browser.",
    year: "2026",
    stack: ["React", "TypeScript", "ECharts", "IndexedDB"],
    image: "/media/freeform-artifacts.webp",
    imageAlt: "Freeform Artifacts canvas showing metric, probability, flow, Sankey, and table artifacts",
    repoUrl: "https://github.com/siriusctrl/freeform-artifacts",
    demoUrl: "https://siriusctrl.github.io/freeform-artifacts/",
    featured: true,
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
    image: "/media/termviz.webp",
    imageAlt: "termviz rendering a multi-series latency plot in a real terminal emulator",
    repoUrl: "https://github.com/siriusctrl/termviz",
    install: "cargo install --git https://github.com/siriusctrl/termviz",
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
