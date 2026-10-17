import { expect, test, type Locator, type Page } from "@playwright/test";
import { isRecentProject, projectGroups, projects, projectsByDate } from "../src/data/projects";

test("home page presents ideas, writing, and projects", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Some ideas need to run. Others need to be written down.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current threads" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interfaces beyond the transcript" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agents with observable state" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Static software as a publishing medium" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A Chat Log Is Not a Knowledge Structure" }),
  ).toBeVisible();
  for (const slug of ["freeform-artifacts", "lattice", "fiasco", "towerlab"]) {
    await expect(page.locator(`.thread-links a[href="/projects/${slug}/"]`)).toHaveCount(1);
  }
  await expect(page.getByRole("heading", { name: "Recently", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "All projects" })).toHaveAttribute("href", "/projects/");
  await expect(page.getByRole("link", { name: "Read the writing" })).toHaveAttribute("href", "/notes/");
});

test("project portraits keep their light paper when the OS prefers dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/projects/");
  const portraitProjects = projects.filter((project) => project.image === project.portrait);
  expect(portraitProjects.length).toBeGreaterThan(0);
  const portraits = page.locator("body > main .catalog-thumb.has-portrait-art img");
  await expect(portraits).toHaveCount(portraitProjects.length);
  for (const portrait of await portraits.all()) {
    await portrait.scrollIntoViewIfNeeded();
    await expect(portrait).toHaveAttribute("src", /^\/media\/portraits\/[a-z-]+\.svg$/);
    await expect.poll(() => portrait.evaluate((image) => (
      (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
    ))).toBe(true);
  }
  const samplePaperColors = () => portraits.evaluateAll(async (images) => Promise.all(
    images.map(async (image) => {
      await (image as HTMLImageElement).decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1000;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Portrait test could not create a canvas context");
      context.drawImage(image as HTMLImageElement, 0, 0, canvas.width, canvas.height);
      return Array.from(context.getImageData(10, 10, 1, 1).data);
    }),
  ));

  const count = portraitProjects.length;
  await expect.poll(samplePaperColors).toEqual(Array.from({ length: count }, () => [239, 238, 233, 255]));
});

test("site is light-only: no theme toggle and the light palette even when the OS prefers dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("siriusctrl.language")) {
      window.localStorage.setItem("siriusctrl.language", "en");
    }
  });

  for (const route of ["/", "/projects/", "/notes/context-not-control/"]) {
    await page.goto(route);
    await expect(page.getByTestId("theme-toggle")).toHaveCount(0);
    await expect(page.locator(".site-header button")).toHaveCount(0);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);

    const surface = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      const before = getComputedStyle(document.body, "::before");
      const after = getComputedStyle(document.body, "::after");
      return {
        dataTheme: document.documentElement.dataset.theme ?? null,
        prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
        colorScheme: root.colorScheme.split(/\s+/).sort().join(" "),
        background: root.getPropertyValue("--bg").trim(),
        surfaceStrong: root.getPropertyValue("--surface-strong").trim(),
        bodyBackground: body.backgroundColor,
        bodyColor: body.color,
        beforeImage: before.backgroundImage,
        afterImage: after.backgroundImage,
        themeColor: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
      };
    });
    expect(surface, route).toEqual({
      dataTheme: null,
      prefersDark: true,
      colorScheme: "light only",
      background: "#eeefeb",
      surfaceStrong: "#fafaf6",
      bodyBackground: "rgb(238, 239, 235)",
      bodyColor: "rgb(37, 39, 36)",
      beforeImage: "none",
      afterImage: "none",
      themeColor: "#eeefeb",
    });

    const ratios = await page.evaluate(() => {
      const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      const luminance = (channels: number[]) => {
        const linear = channels.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      };
      const background = luminance(parse(getComputedStyle(document.body).backgroundColor));
      const selectors = [
        "h1",
        ".intro-statement",
        ".prose p",
        ".article-header > p",
        ".catalog-card p",
        ".site-header nav > a",
      ];
      return Object.fromEntries(selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [selector, null];
        const foreground = luminance(parse(getComputedStyle(element).color));
        const lighter = Math.max(foreground, background);
        const darker = Math.min(foreground, background);
        return [selector, (lighter + 0.05) / (darker + 0.05)];
      }));
    });
    for (const [selector, ratio] of Object.entries(ratios)) {
      if (ratio === null) continue;
      expect(ratio, `${selector} contrast on ${route}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("article language follows the browser and remembers an explicit choice", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, get: () => "zh-CN" });
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => ["zh-CN", "zh", "en"],
    });
  });

  await page.goto("/notes/rebuilding-the-site/");
  await expect(page).toHaveURL(/\/zh\/notes\/rebuilding-the-site\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", { level: 1, name: "围绕可运行的软件，重做个人网站" })).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    document.fonts.check('17px "Noto Serif SC Variable"', "围绕可运行的软件"),
  )).toBe(true);
  const chineseType = await page.evaluate(() => ({
    title: Number.parseFloat(getComputedStyle(document.querySelector(".article-header h1")!).fontSize),
    body: Number.parseFloat(getComputedStyle(document.querySelector(".prose p")!).fontSize),
  }));
  expect(chineseType.title).toBeLessThanOrEqual(60);
  expect(chineseType.body).toBeLessThanOrEqual(17);
  await expect(page.getByRole("link", { name: "阅读中文版" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/notes/rebuilding-the-site/",
  );
  await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/zh/notes/rebuilding-the-site/",
  );

  await page.getByRole("link", { name: "阅读英文版" }).click();
  await expect(page).toHaveURL(/\/notes\/rebuilding-the-site\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Rebuilding a personal site around working software",
  })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("siriusctrl.language"))).toBe("en");

  await page.reload();
  await expect(page).toHaveURL(/\/notes\/rebuilding-the-site\/$/);
});

test("article artwork keeps its light paper when the OS prefers dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("siriusctrl.language")) {
      window.localStorage.setItem("siriusctrl.language", "en");
    }
  });
  await page.goto("/notes/rebuilding-the-site/");
  const artwork = page.locator("body > main .article-note-artwork img");
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveAttribute("src", "/media/notes/rebuilding-the-site.svg");

  const samplePaperColor = () => artwork.evaluate(async (image) => {
    await (image as HTMLImageElement).decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Article artwork test could not create a canvas context");
    context.drawImage(image as HTMLImageElement, 0, 0, canvas.width, canvas.height);
    return Array.from(context.getImageData(10, 10, 1, 1).data);
  });

  await expect.poll(samplePaperColor).toEqual([239, 238, 233, 255]);
});

test("context not control publishes complete bilingual media", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("siriusctrl.language")) {
      window.localStorage.setItem("siriusctrl.language", "en");
    }
  });
  await page.goto("/notes/context-not-control/");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Context, Not Control: Managing an Agent Workforce",
  })).toBeVisible();
  await expect(page.locator(".article-note-artwork img")).toHaveAttribute(
    "src",
    "/media/notes/context-not-control.svg",
  );

  const bodyImages = page.locator(".prose img");
  await expect(bodyImages).toHaveCount(3);
  await expect(bodyImages.nth(0)).toHaveAttribute("src", "/media/notes/gymnasium-cart-pole.gif");
  await expect(bodyImages.nth(1)).toHaveAttribute("src", "/media/notes/context-not-control-loop.svg");
  await expect(bodyImages.nth(2)).toHaveAttribute(
    "src",
    "/media/notes/context-not-control-orchestrator.svg",
  );
  for (const image of await bodyImages.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => {
      const media = element as HTMLImageElement;
      return media.complete && media.naturalWidth > 0 && media.naturalHeight > 0;
    })).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

  await page.getByRole("link", { name: "Read in Chinese" }).click();
  await expect(page).toHaveURL(/\/zh\/notes\/context-not-control\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Context, Not Control：管理 Agent Workforce",
  })).toBeVisible();
  await expect(page.locator(".prose img")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});

test("beyond linear chat publishes as a bilingual Working Set essay", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem("siriusctrl.language")) {
      window.localStorage.setItem("siriusctrl.language", "en");
    }
  });

  await page.goto("/notes/beyond-linear-chat/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "A Chat Log Is Not a Knowledge Structure",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "The timeline is not the enemy",
  })).toBeVisible();
  await expect(page.locator(".article-note-artwork img")).toHaveAttribute(
    "src",
    "/media/notes/beyond-linear-chat.svg",
  );
  await expect(page.getByRole("link", { name: "Lattice prototype" })).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/lattice/",
  );
  await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/zh/notes/beyond-linear-chat/",
  );

  await page.getByRole("link", { name: "Read in Chinese" }).click();
  await expect(page).toHaveURL(/\/zh\/notes\/beyond-linear-chat\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("heading", {
    level: 1,
    name: "对话会分叉，阅读仍应成篇",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    level: 2,
    name: "图谱负责方向与出处，不负责正文",
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lattice 原型" })).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/lattice/",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});

// Card thumbnails sit under the card's stretched title link; click where a pointer would.
const clickCenter = async (page: Page, target: Locator) => {
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox();
  if (!bounds) throw new Error("Card thumbnail did not expose its bounds");
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
};

test("projects index shows the whole catalog at a glance without hijacking scroll", async ({ page, isMobile }) => {
  await page.goto("/projects/");
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  const ordered = projectsByDate();
  const items = page.locator("body > main [data-catalog-item]");
  await expect(items).toHaveCount(projects.length);
  for (const item of await items.all()) await expect(item).toBeVisible();
  expect(await items.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLElement).dataset.catalogItem)
  )).toEqual(ordered.map((project) => project.slug));

  const lead = page.locator(".catalog-lead");
  await expect(lead.getByRole("heading", { level: 2 })).toHaveText(ordered[0]!.name);
  if (isRecentProject(ordered[0]!)) await expect(lead.locator(".badge-new")).toHaveText(/new/i);

  const layout = await page.evaluate(() => {
    const main = document.querySelector("body > main")!;
    const pinned = [...main.querySelectorAll("*")].filter((element) =>
      ["sticky", "fixed"].includes(getComputedStyle(element).position)
    ).length;
    const cards = [...document.querySelectorAll<HTMLElement>(".catalog-card")];
    return {
      pinned,
      tallestCard: Math.max(...cards.map((card) => card.getBoundingClientRect().height)),
      columns: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))).size,
      viewport: window.innerHeight,
    };
  });
  expect(layout.pinned).toBe(0);
  expect(layout.tallestCard).toBeLessThan(layout.viewport);
  expect(layout.columns).toBe(isMobile ? 1 : 3);

  if (!isMobile) {
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 320);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(280);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(360);
  }
});

test("project filters show the matching subset and All restores the catalog", async ({ page }) => {
  await page.goto("/projects/");
  const filters = page.getByRole("group", { name: "Filter projects" });
  await expect(filters).toBeVisible();
  const visibleSlugs = () => page.locator("body > main [data-catalog-item]").evaluateAll((elements) =>
    elements
      .filter((element) => !(element as HTMLElement).hidden && (element as HTMLElement).offsetParent !== null)
      .map((element) => (element as HTMLElement).dataset.catalogItem)
  );
  const allButton = filters.getByRole("button", { name: `All ${projects.length}` });
  await expect(allButton).toHaveAttribute("aria-pressed", "true");
  const ordered = projectsByDate();

  for (const group of projectGroups) {
    const button = filters.getByRole("button", { name: group.label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(allButton).toHaveAttribute("aria-pressed", "false");
    const expected = ordered
      .filter((project) => (group.kinds as ReadonlyArray<string>).includes(project.kind))
      .map((project) => project.slug);
    expect(expected.length).toBeGreaterThan(0);
    await expect.poll(visibleSlugs).toEqual(expected);
  }

  await allButton.click();
  await expect(allButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(visibleSlugs).toEqual(ordered.map((project) => project.slug));
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("projects index keeps every card visible", async ({ page }) => {
    await page.goto("/projects/");
    const items = page.locator("body > main [data-catalog-item]");
    await expect(items).toHaveCount(projects.length);
    for (const item of await items.all()) await expect(item).toBeVisible();
    await expect(page.locator("[data-catalog-filters]")).toBeHidden();
  });
});

test("catalog cards link to their detail pages", async ({ page }) => {
  await page.goto("/projects/");
  const [lead, ...rest] = projectsByDate();
  const leadCard = page.locator(".catalog-lead");
  await expect(leadCard.getByRole("link", { name: lead!.name, exact: true }))
    .toHaveAttribute("href", `/projects/${lead!.slug}/`);
  await expect(leadCard.getByRole("link", { name: "Details" })).toHaveAttribute("href", `/projects/${lead!.slug}/`);
  await expect(leadCard.getByRole("link", { name: /Source/ })).toHaveAttribute("href", lead!.repoUrl);
  if (lead!.demoUrl) {
    await expect(leadCard.getByRole("link", { name: /Open demo/ })).toHaveAttribute("href", lead!.demoUrl);
  }

  for (const project of rest) {
    await expect(page.locator(".catalog-card").getByRole("link", { name: project.name, exact: true }))
      .toHaveAttribute("href", `/projects/${project.slug}/`);
  }

  const target = rest[rest.length - 1]!;
  const thumb = page.locator(".catalog-card", { has: page.getByRole("link", { name: target.name, exact: true }) })
    .locator(".catalog-thumb");
  await clickCenter(page, thumb);
  await expect(page).toHaveURL(new RegExp(`/projects/${target.slug}/$`));
  await expect(page.getByRole("heading", { level: 1, name: target.name })).toBeVisible();
});

test("home Recently strip shows the two newest projects and the newest note", async ({ page, isMobile }) => {
  await page.goto("/");
  const section = page.locator(".recent-section");
  await expect(section.getByRole("heading", { level: 2, name: "Recently" })).toBeVisible();
  await expect(section.getByRole("link", { name: "All projects" })).toHaveAttribute("href", "/projects/");

  const items = section.locator(".recent-item");
  await expect(items).toHaveCount(3);
  const summary = await items.evaluateAll((elements) => elements.map((element) => ({
    type: (element as HTMLElement).dataset.recentItem,
    date: element.querySelector("time")?.getAttribute("datetime") ?? "",
    href: element.querySelector("h3 a")?.getAttribute("href") ?? "",
    width: element.getBoundingClientRect().width,
  })));
  expect(summary.filter((item) => item.type === "project").map((item) => item.href).sort())
    .toEqual(projectsByDate().slice(0, 2).map((project) => `/projects/${project.slug}/`).sort());
  expect(summary.filter((item) => item.type === "note")).toHaveLength(1);
  const times = summary.map((item) => Date.parse(item.date));
  expect(times).toEqual([...times].sort((a, b) => b - a));
  if (!isMobile) expect(summary[0]!.width).toBeGreaterThan(summary[1]!.width * 1.2);

  const note = summary.find((item) => item.type === "note")!;
  expect(note.href).toBe("/notes/beyond-linear-chat/");
  await section.locator(`h3 a[href="${note.href}"]`).click();
  await expect(page).toHaveURL(/\/notes\/beyond-linear-chat\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "A Chat Log Is Not a Knowledge Structure" })).toBeVisible();

  await page.goto("/");
  const first = summary[0]!;
  await clickCenter(page, items.first().locator(".catalog-thumb, .note-artwork"));
  await expect(page).toHaveURL(new RegExp(`${first.href}$`));
});

test("Recently strip and projects grid align thumbnails, titles, summaries, and meta per row", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Row alignment applies to the multi-column desktop layouts");

  const rowEdges = (selector: string) => page.locator(selector).evaluateAll((cards) =>
    cards.map((card) => {
      const box = (part: string) => card.querySelector(part)!.getBoundingClientRect();
      return {
        thumbHeight: box("figure").height,
        thumbTop: box("figure").top,
        title: box("h3").top,
        summary: box("p").top,
        meta: box(".project-meta").top,
      };
    }));
  const expectAligned = (values: number[]) => {
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const recent = await rowEdges(".recent-item");
  expect(recent).toHaveLength(3);
  for (const edge of ["thumbHeight", "thumbTop", "title", "summary", "meta"] as const) {
    expectAligned(recent.map((item) => item[edge]));
  }
  const recentWidths = await page.locator(".recent-item").evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().width)
  );
  expect(recentWidths[0]!).toBeGreaterThan(recentWidths[1]! * 1.2);

  await page.goto("/projects/");
  // A longer summary in one card must not push its neighbours' rows out of line.
  await page.locator(".catalog-grid .catalog-card p").first().evaluate((summary) => {
    summary.textContent += " An intentionally longer summary that wraps onto several more lines than the rest.";
  });
  const cards = await rowEdges(".catalog-grid .catalog-card");
  expect(cards.length).toBeGreaterThanOrEqual(3);
  const rows = new Map<number, typeof cards>();
  for (const card of cards) {
    const key = Math.round(card.thumbTop);
    rows.set(key, [...(rows.get(key) ?? []), card]);
  }
  expect([...rows.values()].some((row) => row.length > 1)).toBe(true);
  for (const row of rows.values()) {
    for (const edge of ["title", "summary", "meta"] as const) {
      expectAligned(row.map((card) => card[edge]));
    }
  }
});

test("reduced motion turns off smooth scrolling without snapping", async ({ page, isMobile }) => {
  test.skip(isMobile, "Reduced-motion fallback only needs one browser profile");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior))
    .toBe("auto");
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType))
    .toBe("none");
});

test("project and note routes render real content", async ({ page, isMobile }) => {
  await page.goto("/projects/");
  await page.getByRole("link", { name: "Lattice", exact: true }).first().click();
  await expect(page).toHaveURL(/\/projects\/lattice\/$/);
  await expect(page.getByRole("link", { name: /Open demo/ })).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/lattice/",
  );
  await expect(page.getByText(/Browse a completed research DAG/)).toBeVisible();
  await expect(page.getByText("DAG navigation", { exact: true })).toBeVisible();
  await expect(page.getByAltText(/conversation card connected to a stable research graph/)).toBeVisible();

  await page.goto("/projects/");
  await page.getByRole("link", { name: "Freeform Artifacts", exact: true }).first().click();
  await expect(page).toHaveURL(/\/projects\/freeform-artifacts\/$/);
  await expect(page.getByRole("link", { name: /Open demo/ })).toBeVisible();
  await expect(page.getByText(/Build with AI can install a trusted artifact bundle/)).toBeVisible();
  await expect(page.getByText("Chart Kit / ECharts", { exact: true })).toBeVisible();
  await expect(page.getByText("IndexedDB", { exact: true })).toBeVisible();
  await expect(page.getByAltText(/Dark-mode Freeform Artifacts canvas/)).toBeVisible();

  await page.goto("/projects/classical-atlas/");
  await expect(page.getByRole("heading", { level: 1, name: "Classical Atlas" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open demo/ })).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/classical-atlas/",
  );
  await expect(page.getByText("d3-geo", { exact: true })).toBeVisible();
  await expect(page.getByAltText(/Sicilian expedition as a blue band/)).toBeVisible();

  await page.goto("/projects/picoagent/");
  await expect(page).toHaveURL(/\/projects\/fiasco\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fiasco" })).toBeVisible();
  await expect(page.getByRole("link", { name: /View source/ })).toHaveAttribute(
    "href",
    "https://github.com/siriusctrl/fiasco",
  );
  await expect(page.getByText(/Orchestrate the agents\. Contain the fiasco\./)).toBeVisible();
  await expect(
    page.getByText(/A headless Rust orchestrator for multiple agents and background jobs\./),
  ).toBeVisible();
  await expect(page.getByAltText(/Fiasco orchestration trace/)).toBeVisible();

  await page.goto("/notes/");
  const noteRows = page.locator(".notes-index-row");
  expect(await noteRows.count()).toBeGreaterThanOrEqual(2);
  const noteRow = noteRows.first();
  const rowSpacing = await noteRows.evaluateAll((rows) => {
    const first = getComputedStyle(rows[0]);
    const second = getComputedStyle(rows[1]);
    return {
      firstPaddingTop: Number.parseFloat(first.paddingTop),
      firstPaddingBottom: Number.parseFloat(first.paddingBottom),
      secondPaddingTop: Number.parseFloat(second.paddingTop),
    };
  });
  expect(rowSpacing.firstPaddingTop).toBe(0);
  expect(rowSpacing.secondPaddingTop).toBeGreaterThanOrEqual(40);
  expect(Math.abs(rowSpacing.firstPaddingBottom - rowSpacing.secondPaddingTop)).toBeLessThan(1);
  const noteArtwork = noteRow.locator(".notes-index-artwork");
  const noteDate = noteRow.locator("time");
  const noteTitle = noteRow.getByRole("heading", {
    name: "A Chat Log Is Not a Knowledge Structure",
  });
  await expect(noteArtwork.locator("img")).toBeVisible();
  if (!isMobile) {
    const [artworkBounds, dateBounds, titleBounds] = await Promise.all([
      noteArtwork.boundingBox(),
      noteDate.boundingBox(),
      noteTitle.boundingBox(),
    ]);
    if (!artworkBounds || !dateBounds || !titleBounds) {
      throw new Error("Writing index did not expose its visual layout bounds");
    }
    expect(Math.abs(artworkBounds.x - dateBounds.x)).toBeLessThan(1);
    expect(artworkBounds.y).toBeGreaterThan(dateBounds.y + dateBounds.height);
    expect(artworkBounds.width).toBeLessThanOrEqual(240);
    expect(titleBounds.x).toBeGreaterThan(artworkBounds.x + artworkBounds.width);
    const indexType = await noteRow.evaluate((row) => ({
      title: Number.parseFloat(getComputedStyle(row.querySelector("h2")!).fontSize),
      summary: Number.parseFloat(getComputedStyle(row.querySelector("p")!).fontSize),
      paddingBottom: Number.parseFloat(getComputedStyle(row).paddingBottom),
      height: row.getBoundingClientRect().height,
    }));
    expect(indexType.title).toBeLessThanOrEqual(42);
    expect(indexType.summary).toBeLessThanOrEqual(15);
    expect(indexType.paddingBottom).toBeLessThanOrEqual(52);
    expect(indexType.height).toBeLessThanOrEqual(240);
  }
  await page.getByRole("link", { name: "A Chat Log Is Not a Knowledge Structure" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "The timeline is not the enemy" })).toBeVisible();
  await expect.poll(() => page.locator(".prose p").first().evaluate((paragraph) =>
    Number.parseFloat(getComputedStyle(paragraph).fontSize),
  )).toBeLessThanOrEqual(17);
});

test("mobile layouts do not overflow the viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile project only");

  for (const route of [
    "/",
    "/projects/",
    "/projects/freeform-artifacts/",
    "/projects/classical-atlas/",
    "/notes/",
    "/notes/context-not-control/",
    "/notes/rebuilding-the-site/",
    "/notes/beyond-linear-chat/",
  ]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
  }

  await page.evaluate(() => window.localStorage.setItem("siriusctrl.language", "zh"));
  await page.goto("/zh/notes/beyond-linear-chat/");
  const chineseDimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(chineseDimensions.scrollWidth).toBeLessThanOrEqual(chineseDimensions.innerWidth);
});
