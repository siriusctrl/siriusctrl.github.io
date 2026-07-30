import { expect, test } from "@playwright/test";

test("home page presents ideas, writing, projects, and keeps the chosen theme", async ({ page }) => {
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
    page.getByRole("heading", { name: "Context, Not Control: Managing an Agent Workforce" }),
  ).toBeVisible();
  await expect(page.locator('a[href="/projects/freeform-artifacts/"]')).toHaveCount(2);
  await expect(page.locator('a[href="/projects/lattice/"]')).toHaveCount(2);
  await expect(page.locator('a[href="/projects/fiasco/"]')).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "All projects" })).toHaveAttribute("href", "/projects/");
  await expect(page.getByRole("link", { name: "Read the writing" })).toHaveAttribute("href", "/notes/");

  const themeToggle = page.getByTestId("theme-toggle");
  const themeToggleBounds = await themeToggle.boundingBox();
  expect(themeToggleBounds).not.toBeNull();
  const clickPosition = { x: 6, y: 6 };
  await themeToggle.click({ position: clickPosition });
  const animatedThemeChange = await page.evaluate(() =>
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  if (animatedThemeChange) {
    await expect(page.locator("html")).toHaveAttribute("data-theme-transition", "active");
    const reveal = page.locator("[data-theme-reveal]");
    await expect(reveal).toBeVisible();
    const revealOrigin = await reveal.evaluate((element) => ({
      x: element.getBoundingClientRect().left
        + Number.parseFloat((element as HTMLElement).style.getPropertyValue("--theme-reveal-x"))
          * (element.getBoundingClientRect().width / (element as HTMLElement).offsetWidth),
      y: element.getBoundingClientRect().top
        + Number.parseFloat((element as HTMLElement).style.getPropertyValue("--theme-reveal-y"))
          * (element.getBoundingClientRect().height / (element as HTMLElement).offsetHeight),
      animationId: element.getAnimations()[0]?.id,
      pointerEvents: getComputedStyle(element).pointerEvents,
      rootTheme: document.documentElement.dataset.theme,
      layerTheme: (element as HTMLElement).dataset.theme,
    }));
    expect(Math.abs(revealOrigin.x - (themeToggleBounds!.x + themeToggleBounds!.width / 2))).toBeLessThan(0.1);
    expect(Math.abs(revealOrigin.y - (themeToggleBounds!.y + themeToggleBounds!.height / 2))).toBeLessThan(0.1);
    expect(revealOrigin.animationId).toBe("theme-reveal");
    expect(revealOrigin.pointerEvents).toBe("none");
    expect(revealOrigin.rootTheme).toBe("light");
    expect(revealOrigin.layerTheme).toBe("dark");
  }
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.themeTransition)).toBeUndefined();
  await page.reload();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
});

test("theme reveal stays visibly anchored on a 4k viewport", async ({ page, isMobile }) => {
  test.skip(isMobile, "4k coverage uses the desktop browser profile");

  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.goto("/");
  const themeToggle = page.getByTestId("theme-toggle");
  const bounds = await themeToggle.boundingBox();
  if (!bounds) throw new Error("Theme toggle did not expose its bounds");

  await themeToggle.click({ position: { x: 6, y: 6 } });
  const reveal = page.locator("[data-theme-reveal]");
  await expect(reveal).toBeVisible();
  const geometry = await reveal.evaluate((element) => {
    const style = (element as HTMLElement).style;
    const bounds = element.getBoundingClientRect();
    const scaleX = bounds.width / (element as HTMLElement).offsetWidth;
    const scaleY = bounds.height / (element as HTMLElement).offsetHeight;
    return {
      x: bounds.left + Number.parseFloat(style.getPropertyValue("--theme-reveal-x")) * scaleX,
      y: bounds.top + Number.parseFloat(style.getPropertyValue("--theme-reveal-y")) * scaleY,
      width: (element as HTMLElement).offsetWidth,
      height: (element as HTMLElement).offsetHeight,
      scale: Math.min(scaleX, scaleY),
      startRadius: Number.parseFloat(style.getPropertyValue("--theme-reveal-start-radius")),
      endRadius: Number.parseFloat(style.getPropertyValue("--theme-reveal-end-radius")),
      rootTheme: document.documentElement.dataset.theme,
      layerTheme: (element as HTMLElement).dataset.theme,
      inert: (element as HTMLElement).inert,
      scripts: element.querySelectorAll("script").length,
      duplicateHooks: element.querySelectorAll("[id], [data-testid], [data-theme-toggle]").length,
    };
  });
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("4k reveal test did not expose a viewport");
  const expectedX = bounds.x + bounds.width / 2;
  const expectedY = bounds.y + bounds.height / 2;
  expect(Math.abs(geometry.x - expectedX)).toBeLessThan(0.1);
  expect(Math.abs(geometry.y - expectedY)).toBeLessThan(0.1);
  expect(Math.abs(geometry.startRadius - bounds.width / 2)).toBeLessThan(0.1);
  const expectedRadius = Math.hypot(
    Math.max(expectedX, viewport.width - expectedX),
    Math.max(expectedY, viewport.height - expectedY),
  );
  expect(geometry.endRadius * geometry.scale).toBeGreaterThanOrEqual(expectedRadius);
  expect(geometry.endRadius * geometry.scale - expectedRadius).toBeLessThan(0.1);
  expect(geometry.rootTheme).toBe("light");
  expect(geometry.layerTheme).toBe("dark");
  expect(geometry.inert).toBe(true);
  expect(geometry.scripts).toBe(0);
  expect(geometry.duplicateHooks).toBe(0);

  const readRadius = () => reveal.evaluate((element) => {
    const clipPath = getComputedStyle(element).clipPath;
    return Number(clipPath.match(/circle\(([\d.]+)px/)?.[1] ?? Number.NaN);
  });
  await expect.poll(() => reveal.evaluate((element) => Number(element.getAnimations()[0]?.currentTime ?? -1)))
    .toBeGreaterThan(20);
  const earlyRadius = await readRadius();
  await page.waitForTimeout(120);
  expect(await readRadius()).toBeGreaterThan(earlyRadius);
});

test("theme reveal and live content keep moving through wheel and keyboard scrolling", async ({ page, isMobile }) => {
  test.skip(isMobile, "Wheel and keyboard scrolling use the desktop browser profile");

  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/notes/context-not-control/");
  const toggle = page.getByTestId("theme-toggle");
  const toggleBounds = await toggle.boundingBox();
  if (!toggleBounds) throw new Error("Theme toggle did not expose pointer coordinates");
  const clickToggleThen = async (sendInput: () => Promise<void>) => {
    await page.mouse.move(
      toggleBounds.x + toggleBounds.width / 2,
      toggleBounds.y + toggleBounds.height / 2,
    );
    await page.mouse.down();
    const release = page.mouse.up();
    const input = sendInput();
    await Promise.all([release, input]);
  };

  type RevealReference = {
    layer: HTMLElement;
    animation: Animation;
  };

  type InputProof = {
    clickEventTime: number;
    inputEventTime: number;
    animationTimeAtInput: number;
    sameLayerAtInput: boolean;
    sameAnimationAtInput: boolean;
    before?: {
      currentTime: number;
      scrollY: number;
      originalTop: number;
      cloneTop: number;
      originX: number;
      originY: number;
      toggleX: number;
      toggleY: number;
      rootTheme: string | undefined;
      layerTheme: string | undefined;
    };
  };

  const installInputProof = (
    input: { type: "wheel" } | { type: "key"; key: "PageDown" | "ArrowDown" },
  ) => page.evaluate((input) => {
    const proof: InputProof = {
      clickEventTime: Number.NaN,
      inputEventTime: Number.NaN,
      animationTimeAtInput: Number.NaN,
      sameLayerAtInput: false,
      sameAnimationAtInput: false,
    };
    const proofWindow = window as typeof window & {
      __themeInputProof?: InputProof;
      __themeRevealReference?: RevealReference;
    };
    proofWindow.__themeInputProof = proof;
    delete proofWindow.__themeRevealReference;

    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    if (!toggle) throw new Error("Theme toggle was unavailable while installing input proof");
    toggle.addEventListener("click", (event) => {
      proof.clickEventTime = event.timeStamp;
    }, { capture: true, once: true });
    toggle.addEventListener("click", () => {
      queueMicrotask(() => {
        const layer = document.querySelector<HTMLElement>("[data-theme-reveal]");
        const animation = layer?.getAnimations().find((candidate) => candidate.id === "theme-reveal");
        const original = document.querySelector<HTMLElement>("body > main .prose p");
        const clone = layer?.querySelector<HTMLElement>(":scope > main .prose p");
        if (!layer || !animation || !original || !clone) return;
        proofWindow.__themeRevealReference = { layer, animation };
        const layerBounds = layer.getBoundingClientRect();
        const toggleBounds = toggle.getBoundingClientRect();
        const x = Number.parseFloat(layer.style.getPropertyValue("--theme-reveal-x"));
        const y = Number.parseFloat(layer.style.getPropertyValue("--theme-reveal-y"));
        proof.before = {
          currentTime: Number(animation.currentTime),
          scrollY: window.scrollY,
          originalTop: original.getBoundingClientRect().top,
          cloneTop: clone.getBoundingClientRect().top,
          originX: layerBounds.left + x * (layerBounds.width / layer.offsetWidth),
          originY: layerBounds.top + y * (layerBounds.height / layer.offsetHeight),
          toggleX: toggleBounds.left + toggleBounds.width / 2,
          toggleY: toggleBounds.top + toggleBounds.height / 2,
          rootTheme: document.documentElement.dataset.theme,
          layerTheme: layer.dataset.theme,
        };
      });
    }, { once: true });

    const recordInput = (event: WheelEvent | KeyboardEvent) => {
      if (input.type === "key" && (!(event instanceof KeyboardEvent) || event.key !== input.key)) {
        return;
      }
      proof.inputEventTime = event.timeStamp;
      const reference = proofWindow.__themeRevealReference;
      const layer = document.querySelector<HTMLElement>("[data-theme-reveal]");
      const animation = layer?.getAnimations().find((candidate) => candidate.id === "theme-reveal");
      proof.animationTimeAtInput = Number(animation?.currentTime ?? Number.NaN);
      proof.sameLayerAtInput = reference?.layer === layer;
      proof.sameAnimationAtInput = reference?.animation === animation;
      if (input.type === "key") window.removeEventListener("keydown", recordInput, true);
    };
    if (input.type === "wheel") {
      window.addEventListener("wheel", recordInput, { capture: true, once: true, passive: true });
    } else {
      window.addEventListener("keydown", recordInput, { capture: true });
    }
  }, input);

  const probe = () => page.evaluate(() => {
    const proofWindow = window as typeof window & {
      __themeInputProof?: InputProof;
      __themeRevealReference?: RevealReference;
    };
    const proof = proofWindow.__themeInputProof;
    const reference = (window as typeof window & {
      __themeRevealReference?: RevealReference;
    }).__themeRevealReference;
    const reveal = document.querySelector<HTMLElement>("[data-theme-reveal]");
    const animation = reveal?.getAnimations().find((candidate) => candidate.id === "theme-reveal");
    const original = document.querySelector<HTMLElement>("body > main .prose p");
    const clone = reveal?.querySelector<HTMLElement>(":scope > main .prose p");
    const layerBounds = reveal?.getBoundingClientRect();
    const clipPath = reveal ? getComputedStyle(reveal).clipPath : "";
    const clipCenter = clipPath.match(/at\s+([\d.]+)px\s+([\d.]+)px/);
    const x = Number(clipCenter?.[1] ?? Number.NaN);
    const y = Number(clipCenter?.[2] ?? Number.NaN);
    return {
      currentTime: Number(animation?.currentTime ?? -1),
      playState: animation?.playState ?? "missing",
      scrollY: window.scrollY,
      originalTop: original?.getBoundingClientRect().top ?? Number.NaN,
      cloneTop: clone?.getBoundingClientRect().top ?? Number.NaN,
      originX: layerBounds && reveal
        ? layerBounds.left + x * (layerBounds.width / reveal.offsetWidth)
        : Number.NaN,
      originY: layerBounds && reveal
        ? layerBounds.top + y * (layerBounds.height / reveal.offsetHeight)
        : Number.NaN,
      clipPath,
      active: document.documentElement.dataset.themeTransition,
      rootTheme: document.documentElement.dataset.theme,
      layerTheme: reveal?.dataset.theme,
      sameLayer: reference?.layer === reveal,
      sameAnimation: reference?.animation === animation,
      viewTransitionAnimations: document.getAnimations().filter((candidate) =>
        (candidate.effect as KeyframeEffect | null)?.pseudoElement?.includes("view-transition")
      ).length,
      proof: proof ? {
        clickEventTime: proof.clickEventTime,
        inputEventTime: proof.inputEventTime,
        animationTimeAtInput: proof.animationTimeAtInput,
        sameLayerAtInput: proof.sameLayerAtInput,
        sameAnimationAtInput: proof.sameAnimationAtInput,
        before: proof.before,
      } : undefined,
    };
  });

  const waitForNaturalEnd = async (theme: "light" | "dark") => {
    await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition", "active");
    await expect(page.locator("[data-theme-reveal]")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
  };

  const resetScroll = async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  };

  const assertActiveInputProof = async ({
    rootTheme,
    layerTheme,
    minimumScroll,
  }: {
    rootTheme: "light" | "dark";
    layerTheme: "light" | "dark";
    minimumScroll: number;
  }) => {
    await expect.poll(async () => {
      const evidence = await probe();
      return evidence.proof?.before
        ? evidence.scrollY - evidence.proof.before.scrollY
        : Number.NEGATIVE_INFINITY;
    }).toBeGreaterThan(minimumScroll);
    const after = await probe();
    const before = after.proof?.before;
    if (!after.proof || !before) throw new Error("Theme input proof was not captured");
    expect(after.proof.inputEventTime - after.proof.clickEventTime).toBeGreaterThanOrEqual(0);
    expect(after.proof.inputEventTime - after.proof.clickEventTime).toBeLessThan(100);
    expect(after.proof.animationTimeAtInput).toBeGreaterThanOrEqual(0);
    expect(after.proof.animationTimeAtInput).toBeLessThan(100);
    expect(after.proof.sameLayerAtInput).toBe(true);
    expect(after.proof.sameAnimationAtInput).toBe(true);
    expect(before.currentTime).toBeGreaterThanOrEqual(0);
    expect(before.currentTime).toBeLessThan(100);
    expect(Math.abs(before.originalTop - before.cloneTop)).toBeLessThan(0.5);
    expect(Math.abs(before.originX - before.toggleX)).toBeLessThan(0.5);
    expect(Math.abs(before.originY - before.toggleY)).toBeLessThan(0.5);
    expect(before.rootTheme).toBe(rootTheme);
    expect(before.layerTheme).toBe(layerTheme);
    expect(after.active).toBe("active");
    expect(after.playState).toBe("running");
    expect(after.currentTime).toBeGreaterThan(before.currentTime);
    expect(after.originalTop).toBeLessThan(before.originalTop - minimumScroll);
    expect(Math.abs(after.originalTop - after.cloneTop)).toBeLessThan(0.5);
    expect(Math.abs(after.originX - before.toggleX)).toBeLessThan(0.5);
    expect(Math.abs(after.originY - before.toggleY)).toBeLessThan(0.5);
    expect(after.sameLayer).toBe(true);
    expect(after.sameAnimation).toBe(true);
    expect(after.rootTheme).toBe(rootTheme);
    expect(after.layerTheme).toBe(layerTheme);
    expect(after.viewTransitionAnimations).toBe(0);
  };

  await resetScroll();
  await installInputProof({ type: "wheel" });
  await clickToggleThen(() => page.mouse.wheel(0, 520));
  await assertActiveInputProof({
    rootTheme: "light",
    layerTheme: "dark",
    minimumScroll: 100,
  });
  await waitForNaturalEnd("dark");

  await resetScroll();
  await installInputProof({ type: "key", key: "PageDown" });
  await clickToggleThen(() => page.keyboard.press("PageDown"));
  await assertActiveInputProof({
    rootTheme: "dark",
    layerTheme: "light",
    minimumScroll: 100,
  });
  await waitForNaturalEnd("light");

  await resetScroll();
  await installInputProof({ type: "key", key: "ArrowDown" });
  await clickToggleThen(() => page.keyboard.press("ArrowDown"));
  await assertActiveInputProof({
    rootTheme: "light",
    layerTheme: "dark",
    minimumScroll: 0,
  });
  await waitForNaturalEnd("dark");
});

test("theme changes keep primary and muted copy readable for every reveal frame", async ({ page, isMobile }) => {
  test.skip(isMobile, "Frame-by-frame contrast coverage only needs one browser profile");

  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/notes/context-not-control/");
  const toggle = page.getByTestId("theme-toggle");
  const collectTransitionContrast = async () => {
    await page.evaluate(() => {
      const state = {
        done: false,
        seenActive: false,
        samples: [] as Array<{
          time: number;
          rootTheme: string | undefined;
          layerTheme: string | undefined;
          originalRatios: Record<string, number>;
          layerRatios: Record<string, number>;
        }>,
      };
      (window as typeof window & { __themeContrastProof?: typeof state }).__themeContrastProof = state;
      const parseColor = (value: string) => {
        const channels = value.match(/[\d.]+/g)?.map(Number);
        if (!channels || channels.length < 3) throw new Error(`Unable to parse color: ${value}`);
        const rgb = channels.slice(0, 3);
        return value.startsWith("color(srgb ") ? rgb.map((channel) => channel * 255) : rgb;
      };
      const luminance = (channels: number[]) => {
        const linear = channels.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      };
      const contrast = (foreground: string, background: string) => {
        const lighter = Math.max(luminance(parseColor(foreground)), luminance(parseColor(background)));
        const darker = Math.min(luminance(parseColor(foreground)), luminance(parseColor(background)));
        return (lighter + 0.05) / (darker + 0.05);
      };
      const originalTargets = {
        heading: "body > main .article-header h1",
        body: "body > main .prose p",
        muted: "body > main .article-header > p",
        navigation: "body > .site-header nav > a",
      };
      const layerTargets = {
        heading: ":scope > main .article-header h1",
        body: ":scope > main .prose p",
        muted: ":scope > main .article-header > p",
        navigation: ":scope > .site-header nav > a",
      };
      const startedAt = performance.now();
      const sample = (now: number) => {
        const active = document.documentElement.dataset.themeTransition === "active";
        if (active) state.seenActive = true;
        if (active) {
          const layer = document.querySelector<HTMLElement>("[data-theme-render-layer]");
          if (!layer) throw new Error("Theme render layer disappeared before the reveal finished");
          const readRatios = (
            scope: Document | HTMLElement,
            targets: Record<string, string>,
            background: string,
          ) => Object.fromEntries(
            Object.entries(targets).map(([name, selector]) => {
              const element = scope.querySelector(selector);
              if (!element) throw new Error(`Missing contrast target: ${selector}`);
              return [name, contrast(getComputedStyle(element).color, background)];
            }),
          );
          state.samples.push({
            time: now - startedAt,
            rootTheme: document.documentElement.dataset.theme,
            layerTheme: layer.dataset.theme,
            originalRatios: readRatios(
              document,
              originalTargets,
              getComputedStyle(document.body).backgroundColor,
            ),
            layerRatios: readRatios(
              layer,
              layerTargets,
              getComputedStyle(layer).backgroundColor,
            ),
          });
        }
        if (!state.seenActive || active) {
          requestAnimationFrame(sample);
        } else {
          state.done = true;
        }
      };
      requestAnimationFrame(sample);
    });
    await toggle.click();
    await page.waitForFunction(() =>
      (window as typeof window & { __themeContrastProof?: { done: boolean } })
        .__themeContrastProof?.done === true
    );
    return page.evaluate(() =>
      (window as typeof window & {
        __themeContrastProof?: {
          samples: Array<{
            time: number;
            rootTheme: string | undefined;
            layerTheme: string | undefined;
            originalRatios: Record<string, number>;
            layerRatios: Record<string, number>;
          }>;
        };
      }).__themeContrastProof?.samples ?? []
    );
  };

  for (const [rootTheme, layerTheme] of [["light", "dark"], ["dark", "light"]] as const) {
    const samples = await collectTransitionContrast();
    expect(samples.length).toBeGreaterThan(30);
    expect(new Set(samples.map((sample) => sample.rootTheme))).toEqual(new Set([rootTheme]));
    expect(new Set(samples.map((sample) => sample.layerTheme))).toEqual(new Set([layerTheme]));
    for (const target of ["heading", "body", "muted", "navigation"]) {
      const originalMinimum = Math.min(...samples.map((sample) => sample.originalRatios[target]));
      const layerMinimum = Math.min(...samples.map((sample) => sample.layerRatios[target]));
      expect(originalMinimum, `${target} contrast in ${rootTheme} surface`).toBeGreaterThanOrEqual(4.5);
      expect(layerMinimum, `${target} contrast in ${layerTheme} surface`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("project portraits follow the selected site theme", async ({ page, isMobile }) => {
  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/projects/");
  const portraits = page.locator(
    isMobile ? "body > main .work-entry-media img" : "body > main [data-work-frame] img",
  );
  await expect(portraits).toHaveCount(6);
  if (isMobile) {
    for (const portrait of await portraits.all()) {
      await portrait.scrollIntoViewIfNeeded();
      await expect.poll(() => portrait.evaluate((image) => (
        (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
      ))).toBe(true);
    }
  }
  const samplePaperColors = () => portraits.evaluateAll(async (images) => Promise.all(
    images.map(async (image) => {
      await (image as HTMLImageElement).decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1000;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Portrait theme test could not create a canvas context");
      context.drawImage(image as HTMLImageElement, 0, 0, canvas.width, canvas.height);
      return Array.from(context.getImageData(10, 10, 1, 1).data);
    }),
  ));

  await expect.poll(samplePaperColors).toEqual(Array.from({ length: 6 }, () => [239, 238, 233, 255]));
  await page.getByTestId("theme-toggle").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(samplePaperColors).toEqual(Array.from({ length: 6 }, () => [26, 29, 27, 255]));
});

test("light and dark canvases stay clean and softly toned", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/");

  const readSurface = () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const before = getComputedStyle(document.body, "::before");
    const after = getComputedStyle(document.body, "::after");
    return {
      background: root.getPropertyValue("--bg").trim(),
      surfaceStrong: root.getPropertyValue("--surface-strong").trim(),
      beforeImage: before.backgroundImage,
      beforeContent: before.content,
      afterImage: after.backgroundImage,
      afterContent: after.content,
      themeColor: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
    };
  });

  await expect.poll(readSurface).toEqual({
    background: "#eeefeb",
    surfaceStrong: "#fafaf6",
    beforeImage: "none",
    beforeContent: "none",
    afterImage: "none",
    afterContent: "none",
    themeColor: "#eeefeb",
  });

  await page.getByTestId("theme-toggle").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(readSurface).toEqual({
    background: "#1b1d1b",
    surfaceStrong: "#292c29",
    beforeImage: "none",
    beforeContent: "none",
    afterImage: "none",
    afterContent: "none",
    themeColor: "#1b1d1b",
  });
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

test("article artwork follows the selected site theme", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("siriusctrl.language", "en");
    window.localStorage.setItem("siriusctrl.theme", "light");
  });
  await page.goto("/notes/rebuilding-the-site/");
  const artwork = page.locator("body > main .article-note-artwork img");
  await expect(artwork).toBeVisible();

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
  await page.getByTestId("theme-toggle").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(samplePaperColor).toEqual([26, 29, 27, 255]);
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
    "/media/notes/context-not-control-light.svg",
  );

  const bodyImages = page.locator(".prose img");
  await expect(bodyImages).toHaveCount(3);
  await expect(bodyImages.nth(0)).toHaveAttribute("src", "/media/notes/gymnasium-cart-pole.gif");
  await expect(bodyImages.nth(1)).toHaveAttribute("src", "/media/notes/context-not-control-loop-light.svg");
  await expect(bodyImages.nth(2)).toHaveAttribute(
    "src",
    "/media/notes/context-not-control-orchestrator-light.svg",
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

test("theme reveal stays anchored across Chrome zoom levels", async ({ page, isMobile }) => {
  test.skip(isMobile, "Browser zoom coverage uses the desktop browser profile");

  for (const zoom of [0.8, 1, 1.25, 1.5]) {
    await page.goto("/");
    const expected = await page.getByTestId("theme-toggle").evaluate((element, scale) => {
      document.documentElement.style.zoom = String(scale);
      const bounds = element.getBoundingClientRect();
      return {
        absoluteX: bounds.left + bounds.width / 2,
        absoluteY: bounds.top + bounds.height / 2,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, zoom);

    await page.getByTestId("theme-toggle").evaluate((element) => (element as HTMLElement).click());
    const geometry = await page.locator("[data-theme-reveal]").evaluate((element) => {
      const style = (element as HTMLElement).style;
      const bounds = element.getBoundingClientRect();
      const scaleX = bounds.width / (element as HTMLElement).offsetWidth;
      const scaleY = bounds.height / (element as HTMLElement).offsetHeight;
      const original = document.querySelector<HTMLElement>("body > main .home-intro h1");
      const clone = element.querySelector<HTMLElement>(":scope > main .home-intro h1");
      if (!original || !clone) throw new Error("Zoom reveal did not preserve the home title");
      const originalBounds = original.getBoundingClientRect();
      const cloneBounds = clone.getBoundingClientRect();
      const originalStyle = getComputedStyle(original);
      const cloneStyle = getComputedStyle(clone);
      return {
        x: bounds.left + Number.parseFloat(style.getPropertyValue("--theme-reveal-x")) * scaleX,
        y: bounds.top + Number.parseFloat(style.getPropertyValue("--theme-reveal-y")) * scaleY,
        animationId: element.getAnimations()[0]?.id,
        layerLeft: bounds.left,
        layerRight: bounds.right,
        layerWidth: bounds.width,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: {
          x: Math.abs(originalBounds.x - cloneBounds.x),
          y: Math.abs(originalBounds.y - cloneBounds.y),
          width: Math.abs(originalBounds.width - cloneBounds.width),
          height: Math.abs(originalBounds.height - cloneBounds.height),
          fontSize: [originalStyle.fontSize, cloneStyle.fontSize],
          lineHeight: [originalStyle.lineHeight, cloneStyle.lineHeight],
          opacity: Math.abs(Number(originalStyle.opacity) - Number(cloneStyle.opacity)),
          transform: [originalStyle.transform, cloneStyle.transform],
        },
      };
    });
    expect(geometry.animationId).toBe("theme-reveal");
    expect(Math.abs(geometry.x - expected.absoluteX)).toBeLessThan(0.1);
    expect(Math.abs(geometry.y - expected.absoluteY)).toBeLessThan(0.1);
    expect(Math.abs(geometry.layerLeft)).toBeLessThan(0.1);
    expect(Math.abs(geometry.layerRight - expected.clientWidth)).toBeLessThan(0.1);
    expect(Math.abs(geometry.layerWidth - expected.clientWidth)).toBeLessThan(0.1);
    expect(geometry.scrollWidth).toBe(expected.scrollWidth);
    expect(geometry.title.x).toBeLessThan(0.1);
    expect(geometry.title.y).toBeLessThan(0.1);
    expect(geometry.title.width).toBeLessThan(0.1);
    expect(geometry.title.height).toBeLessThan(0.1);
    expect(geometry.title.fontSize[1]).toBe(geometry.title.fontSize[0]);
    expect(geometry.title.lineHeight[1]).toBe(geometry.title.lineHeight[0]);
    expect(geometry.title.opacity).toBeLessThan(0.002);
    expect(geometry.title.transform[1]).toBe(geometry.title.transform[0]);
    await expect(page.locator("[data-theme-reveal]")).toHaveCount(0);
  }
});

test("projects stage rebounds small input and advances decisive input", async ({ page, isMobile }) => {
  test.skip(isMobile, "The work-stage controller is a desktop interaction");

  await page.goto("/projects/");
  await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  await expect(page.locator("[data-inspection-stage]")).toHaveCount(0);
  const freeformEntry = page.locator("[data-work-entry=freeform-artifacts]");
  const latticeEntry = page.locator("[data-work-entry=lattice]");
  await freeformEntry.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(page.locator("[data-work-frame=freeform-artifacts]")).toHaveClass(/is-active/);
  await expect
    .poll(() =>
      freeformEntry.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
      }),
    )
    .toBeLessThan(0.75);

  const centeredScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 45);
  await expect
    .poll(() =>
      freeformEntry.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42),
    )
    .toBeLessThan(-1);
  await expect(page.locator("[data-work-frame=freeform-artifacts]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-frame=lattice]")).not.toHaveClass(/is-active/);
  expect(Math.abs(await page.evaluate(() => window.scrollY) - centeredScrollY)).toBeLessThan(1);
  await expect
    .poll(() =>
      freeformEntry.evaluate((element) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)),
    )
    .toBeLessThan(0.5);

  for (const delta of [4, 8, 12, 18, 24, 30, 25, 18, 10, 5, 2]) {
    await page.mouse.wheel(0, delta);
  }
  await expect(page.locator("html")).toHaveClass(/is-work-animating/);
  await page.mouse.wheel(0, 180); // Momentum tail must not skip another project.
  await expect(page.locator("[data-work-frame=lattice]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-frame=fiasco]")).not.toHaveClass(/is-active/);
  await expect(page.locator("html")).not.toHaveClass(/is-work-animating/);
  const finalCenterError = await latticeEntry.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
  });
  expect(finalCenterError).toBeLessThan(1);
});

test("work stage accepts deliberate reversal without mistaking momentum for intent", async ({ page, isMobile }) => {
  test.skip(isMobile, "The work-stage controller is a desktop interaction");

  const centerFreeform = async () => {
    await page.goto("/projects/");
    await page.locator("[data-work-entry=freeform-artifacts]").evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await expect
      .poll(() => page.locator("[data-work-entry=freeform-artifacts]").evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
      }))
      .toBeLessThan(1);
  };
  const wheel = async (deltas: number[]) => {
    for (const delta of deltas) await page.mouse.wheel(0, delta);
  };

  await centerFreeform();
  await wheel([20, 25, 30, 30]);
  await expect(page.locator("html")).toHaveClass(/is-work-animating/);
  await wheel([-10, -20, -30, -40]);
  await expect(page.locator("[data-work-frame=freeform-artifacts]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-stage]")).toHaveAttribute("data-work-navigation-state", "idle");
  await expect
    .poll(() => page.locator("[data-work-entry=freeform-artifacts]").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
    }))
    .toBeLessThan(1);

  await centerFreeform();
  await wheel([20, 25, 30, 30]);
  await wheel([-8, -12, -15]); // A small opposite bounce must not cancel the committed step.
  await expect(page.locator("[data-work-frame=lattice]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-stage]")).toHaveAttribute("data-work-navigation-state", "idle");
  await expect
    .poll(() => page.locator("[data-work-entry=lattice]").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
    }))
    .toBeLessThan(1);
});

test("keyboard navigation advances exactly one centered project", async ({ page, isMobile }) => {
  test.skip(isMobile, "The work-stage controller is a desktop interaction");

  await page.goto("/projects/");
  const entry = (slug: string) => page.locator(`[data-work-entry=${slug}]`);
  await entry("freeform-artifacts").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect
    .poll(() => entry("freeform-artifacts").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
    }))
    .toBeLessThan(1);

  for (const [key, slug] of [
    ["ArrowDown", "lattice"],
    ["ArrowDown", "fiasco"],
    ["ArrowUp", "lattice"],
  ] as const) {
    await page.keyboard.press(key);
    await expect(page.locator(`[data-work-frame=${slug}]`)).toHaveClass(/is-active/);
    await expect(page.locator("[data-work-stage]")).toHaveAttribute("data-work-navigation-state", "idle");
    await expect
      .poll(() => entry(slug).evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
      }))
      .toBeLessThan(1);
  }
});

test("work artwork and copy share the same center through the final item", async ({ page, isMobile }) => {
  test.skip(isMobile, "The sticky work visual is desktop-only");

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/projects/");
    const finalEntry = page.locator("[data-work-entry=termviz]");
    await finalEntry.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await expect
      .poll(() => page.evaluate(() => {
        const entry = document.querySelector<HTMLElement>("[data-work-entry=termviz]")!.getBoundingClientRect();
        const canvas = document.querySelector<HTMLElement>(".work-visual-canvas")!.getBoundingClientRect();
        const viewportCenter = window.innerHeight / 2;
        return Math.max(
          Math.abs(entry.top + entry.height / 2 - viewportCenter),
          Math.abs(canvas.top + canvas.height / 2 - viewportCenter),
        );
      }))
      .toBeLessThan(1);
    await expect(page.locator("[data-work-frame=termviz]")).toHaveClass(/is-active/);
  }
});

test("work visual keeps pace with the first project while leaving the stage", async ({ page, isMobile }) => {
  test.skip(isMobile, "The sticky work visual is desktop-only");

  await page.goto("/projects/");
  const firstEntry = page.locator("[data-work-entry=freeform-artifacts]");
  await firstEntry.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect
    .poll(() =>
      firstEntry.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
      }),
    )
    .toBeLessThan(1);

  const centeredScrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -360);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(centeredScrollY - 100);
  const boundary = await page.evaluate(() => {
    const heading = document.querySelector<HTMLElement>(".page-intro")!.getBoundingClientRect();
    const visual = document.querySelector<HTMLElement>(".work-visual")!.getBoundingClientRect();
    const sticky = document.querySelector<HTMLElement>(".work-visual-canvas")!.getBoundingClientRect();
    const entry = document.querySelector<HTMLElement>("[data-work-entry=freeform-artifacts]")!
      .getBoundingClientRect();
    return {
      relativeCenterOffset: Math.abs(
        sticky.top + sticky.height / 2 - (entry.top + entry.height / 2),
      ),
      stickyCrossesStageBoundary: sticky.top < visual.top,
      stickyOverlapsHeading: sticky.top < heading.bottom,
    };
  });

  expect(boundary.relativeCenterOffset).toBeLessThan(1);
  expect(boundary.stickyCrossesStageBoundary).toBe(false);
  expect(boundary.stickyOverlapsHeading).toBe(false);
});

test("pointer crossing project whitespace does not activate the next project", async ({ page, isMobile }) => {
  test.skip(isMobile, "Pointer hover coverage uses the desktop browser profile");

  await page.goto("/projects/");
  const firstEntry = page.locator("[data-work-entry=freeform-artifacts]");
  await firstEntry.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect
    .poll(() =>
      firstEntry.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
      }),
    )
    .toBeLessThan(1);

  const entriesBounds = await page.locator(".work-entries").boundingBox();
  const viewport = page.viewportSize();
  if (!entriesBounds || !viewport) throw new Error("Work hover test did not expose its geometry");
  const x = entriesBounds.x + entriesBounds.width / 2;
  await page.mouse.move(x, viewport.height / 2);
  await page.mouse.move(x, viewport.height - 1, { steps: 12 });

  const pointerHit = await page.evaluate(({ x, y }) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-work-entry]")?.dataset.workEntry,
  { x, y: viewport.height - 1 });
  expect(["freeform-artifacts", "lattice"]).toContain(pointerHit);
  await expect(page.locator("[data-work-frame=freeform-artifacts]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-frame=lattice]")).not.toHaveClass(/is-active/);
  await expect(firstEntry).toHaveClass(/is-active/);
});

test("reduced motion keeps theme changes immediate", async ({ page, isMobile }) => {
  test.skip(isMobile, "Reduced-motion fallback only needs one browser profile");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByTestId("theme-toggle").click();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition", "active");
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
    name: "Context, Not Control: Managing an Agent Workforce",
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
  await page.getByRole("link", { name: "Context, Not Control: Managing an Agent Workforce" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "AI as the Default Executor" })).toBeVisible();
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
    "/notes/",
    "/notes/context-not-control/",
    "/notes/rebuilding-the-site/",
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
  await page.goto("/zh/notes/rebuilding-the-site/");
  const chineseDimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(chineseDimensions.scrollWidth).toBeLessThanOrEqual(chineseDimensions.innerWidth);
});
