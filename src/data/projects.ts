export interface Project {
  slug: string;
  name: string;
  kind: "Interactive lab" | "Agent orchestrator" | "Terminal game" | "CLI tool";
  summary: string;
  detail: string;
  /** Curated YYYY-MM-DD date of the last meaningful update or release. */
  date: string;
  stack: string[];
  portrait: string;
  portraitAlt: string;
  image: string;
  imageAlt: string;
  repoUrl: string;
  demoUrl?: string;
  install?: string;
}

export const projects: Project[] = [
  {
    slug: "freeform-artifacts",
    name: "Freeform Artifacts",
    kind: "Interactive lab",
    summary: "A local-first spatial canvas for arranging and generating data-backed artifacts with AI.",
    detail:
      "Create multiple named canvases, then drag, resize, pan, zoom, and snap tables, metrics, flows, and managed charts into place. Build with AI can install a trusted artifact bundle directly into the selected view; every visitor's edits remain isolated and persist in their own browser without an account or backend.",
    date: "2026-07-14",
    stack: ["React", "TypeScript", "Chart Kit / ECharts", "IndexedDB"],
    portrait: "/media/portraits/freeform-artifacts.svg",
    portraitAlt: "Minimal drawing of three data artifacts aligning on a spatial canvas",
    image: "/media/freeform-artifacts.webp",
    imageAlt: "Dark-mode Freeform Artifacts canvas showing metric, probability, pipeline, Sankey, and table artifacts",
    repoUrl: "https://github.com/siriusctrl/freeform-artifacts",
    demoUrl: "https://siriusctrl.github.io/freeform-artifacts/",
  },
  {
    slug: "lattice",
    name: "Lattice",
    kind: "Interactive lab",
    summary:
      "A graph-native AI research workspace that keeps side explorations as conversation cards and compiles them into one article.",
    detail:
      "Browse a completed research DAG without losing the natural rhythm of chat. Anchors open existing cards, the active trace moves through a stable graph, follow-up questions stay local to their card, and selected text can become a sourced node. The same material remains available as one continuous article with links back to every source conversation.",
    date: "2026-07-31",
    stack: ["React", "TypeScript", "DAG navigation", "Static export"],
    portrait: "/media/portraits/lattice.svg",
    portraitAlt:
      "Minimal drawing of stacked research cards, one inline follow-up, and a complete connected graph",
    image: "/media/lattice.webp",
    imageAlt:
      "Lattice workspace with a stacked SpaceX conversation card connected to a stable research graph that highlights the active trace",
    repoUrl: "https://github.com/siriusctrl/lattice",
    demoUrl: "https://siriusctrl.github.io/lattice/",
  },
  {
    slug: "classical-atlas",
    name: "Classical Atlas",
    kind: "Interactive lab",
    summary:
      "Interactive map stories about the classical Greek and Roman world, starting with the Peloponnesian War.",
    detail:
      "The first chapter follows one causal thread from 431 to 404 BC: Athens fed by sea and paid by tribute, Sparta wary of its helots, and a war that ended on the grain route at Aegospotami. Readers step through it or let it autoplay like a documentary, and can leave the story at any point to pan the map and hover cities for cited notes. Every frame is a pure function of the step and its time, so navigation, autoplay, and frame capture agree. Influence fields, convoys, a Minard-style band for the Sicilian expedition, and openly licensed artifact photos sit on a Natural Earth base map, with Thucydides cited by book, chapter, and section. The story is written in Chinese.",
    date: "2026-10-17",
    stack: ["TypeScript", "Vite", "d3-geo", "Natural Earth / Pleiades"],
    portrait: "/media/portraits/classical-atlas.svg",
    portraitAlt:
      "Minimal drawing of a grain route running from a narrow strait past allied coasts into one harbour, set by a progress ruler",
    image: "/media/classical-atlas.webp",
    imageAlt:
      "Classical Atlas map story showing the Sicilian expedition as a blue band from Athens around the Peloponnese to Syracuse, beside a Chinese story card",
    repoUrl: "https://github.com/siriusctrl/classical-atlas",
    demoUrl: "https://siriusctrl.github.io/classical-atlas/",
  },
  {
    slug: "fiasco",
    name: "Fiasco",
    kind: "Agent orchestrator",
    summary: "Orchestrate the agents. Contain the fiasco.",
    detail:
      "A headless Rust orchestrator for multiple agents and background jobs. One durable runtime coordinates root and delegated agents, concurrent tool calls, and long-running background jobs with resumable run directories, streaming model providers, skills, MCP, hooks, artifacts, and file-backed memory.",
    date: "2026-07-30",
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
    date: "2026-04-01",
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
    date: "2026-09-18",
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
    date: "2026-06-18",
    stack: ["Rust", "Kitty protocol", "ANSI fallback", "Plot engine"],
    portrait: "/media/portraits/termviz.svg",
    portraitAlt: "Minimal drawing of two plotted series with one focused inspection window",
    image: "/media/termviz.webp",
    imageAlt: "termviz rendering a multi-series latency plot in a real terminal emulator",
    repoUrl: "https://github.com/siriusctrl/termviz",
    install: "cargo install --git https://github.com/siriusctrl/termviz",
  },
];

for (const project of projects) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(project.date) || Number.isNaN(Date.parse(project.date))) {
    throw new Error(`Project ${project.slug} needs a curated YYYY-MM-DD date`);
  }
}

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export const projectGroups = [
  { id: "interactive", label: "Interactive", kinds: ["Interactive lab"] },
  { id: "agents", label: "Agents", kinds: ["Agent orchestrator"] },
  { id: "terminal", label: "Terminal", kinds: ["Terminal game", "CLI tool"] },
] as const satisfies ReadonlyArray<{ id: string; label: string; kinds: ReadonlyArray<Project["kind"]> }>;

export type ProjectGroupId = (typeof projectGroups)[number]["id"];

export function projectGroup(project: Project): ProjectGroupId {
  const group = projectGroups.find((candidate) =>
    (candidate.kinds as ReadonlyArray<Project["kind"]>).includes(project.kind)
  );
  if (!group) throw new Error(`Project kind has no filter group: ${project.kind}`);
  return group.id;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const RECENT_PROJECT_DAYS = 60;

export const projectDate = (project: Project) => new Date(`${project.date}T00:00:00Z`);

export const formatMonthYear = (date: Date) =>
  date.toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" });

/** True when the project date falls within the recent window of `now` (the build date). */
export const isRecentProject = (project: Project, now = new Date()) =>
  now.valueOf() - projectDate(project).valueOf() <= RECENT_PROJECT_DAYS * DAY_MS;

/** Newest first; ties keep catalog order. */
export const projectsByDate = () =>
  [...projects].sort((a, b) => projectDate(b).valueOf() - projectDate(a).valueOf());
