import { expect, test } from "@playwright/test";

test("home page presents recent work and keeps the chosen theme", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Software for seeing what systems are doing." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Open demo/ })).toHaveAttribute(
    "href",
    "https://siriusctrl.github.io/freeform-artifacts/",
  );
  await expect(page.getByRole("heading", { name: "TowerLab" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fiasco" })).toBeVisible();
  await expect(
    page.locator("[data-work-entry=fiasco]").getByText(
      "Orchestrate the agents. Contain the fiasco.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "fmtview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "termviz" })).toBeVisible();

  const themeToggle = page.getByTestId("theme-toggle");
  const themeToggleBounds = await themeToggle.boundingBox();
  expect(themeToggleBounds).not.toBeNull();
  const clickPosition = { x: 6, y: 6 };
  await themeToggle.click({ position: clickPosition });
  const animatedThemeChange = await page.evaluate(
    () => "startViewTransition" in document && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  if (animatedThemeChange) {
    await expect(page.locator("html")).toHaveAttribute("data-theme-transition", "active");
    const readRevealOrigin = () => page.evaluate(() => {
      const animation = document.getAnimations().find((candidate) => {
        const effect = candidate.effect as KeyframeEffect | null;
        return effect?.pseudoElement === "::view-transition-new(root)";
      });
      const effect = animation?.effect as KeyframeEffect | undefined;
      const clipPath = effect?.getKeyframes()[0]?.clipPath;
      const match = typeof clipPath === "string"
        ? clipPath.match(/at\s+([\d.]+)%\s+([\d.]+)%/)
        : null;
      return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
    });
    await expect.poll(readRevealOrigin).not.toBeNull();
    const revealOrigin = await readRevealOrigin();
    if (!revealOrigin) throw new Error("Theme reveal animation did not expose an origin");
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Theme reveal test did not expose a viewport");
    const expectedX = ((themeToggleBounds!.x + themeToggleBounds!.width / 2) / viewport.width) * 100;
    const expectedY = ((themeToggleBounds!.y + themeToggleBounds!.height / 2) / viewport.height) * 100;
    expect(Math.abs(revealOrigin.x - expectedX)).toBeLessThan(0.1);
    expect(Math.abs(revealOrigin.y - expectedY)).toBeLessThan(0.1);
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
  await page.waitForFunction(() =>
    document.getAnimations().some((animation) =>
      (animation.effect as KeyframeEffect | null)?.pseudoElement === "::view-transition-new(root)"
    ),
  );
  const earlyFrame = await page.evaluate(async () => {
    const animation = document.getAnimations().find((candidate) =>
      (candidate.effect as KeyframeEffect | null)?.pseudoElement === "::view-transition-new(root)"
    );
    if (!animation) return null;
    animation.pause();
    animation.currentTime = 180;
    await new Promise(requestAnimationFrame);
    return getComputedStyle(document.documentElement, "::view-transition-new(root)").clipPath;
  });
  const match = earlyFrame?.match(/circle\(([\d.]+)% at ([\d.]+)% ([\d.]+)%\)/);
  if (!match) throw new Error(`Unable to read the 4k reveal frame: ${earlyFrame}`);

  const [, radiusPercent, xPercent, yPercent] = match.map(Number);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("4k reveal test did not expose a viewport");
  const radiusBasis = Math.hypot(viewport.width, viewport.height) / Math.SQRT2;
  expect((radiusPercent / 100) * radiusBasis).toBeLessThan(100);
  expect(Math.abs(xPercent - ((bounds.x + bounds.width / 2) / viewport.width) * 100)).toBeLessThan(0.1);
  expect(Math.abs(yPercent - ((bounds.y + bounds.height / 2) / viewport.height) * 100)).toBeLessThan(0.1);
});

test("project portraits follow the selected site theme", async ({ page, isMobile }) => {
  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/");
  const portraits = page.locator(isMobile ? ".work-entry-media img" : "[data-work-frame] img");
  await expect(portraits).toHaveCount(5);
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

  await expect.poll(samplePaperColors).toEqual(Array.from({ length: 5 }, () => [239, 238, 233, 255]));
  await page.getByTestId("theme-toggle").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(samplePaperColors).toEqual(Array.from({ length: 5 }, () => [26, 29, 27, 255]));
});

test("light and dark canvases keep a restrained paper texture", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/");

  const readSurface = () => page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const grain = getComputedStyle(document.body, "::before");
    return {
      background: root.getPropertyValue("--bg").trim(),
      surfaceStrong: root.getPropertyValue("--surface-strong").trim(),
      grainImage: grain.backgroundImage,
      grainOpacity: grain.opacity,
      grainBlend: grain.mixBlendMode,
      themeColor: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content,
    };
  });

  await expect.poll(readSurface).toEqual({
    background: "#eeefeb",
    surfaceStrong: "#fafaf6",
    grainImage: expect.stringContaining("paper-grain.svg"),
    grainOpacity: "0.028",
    grainBlend: "multiply",
    themeColor: "#eeefeb",
  });

  await page.getByTestId("theme-toggle").click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(readSurface).toEqual({
    background: "#1b1d1b",
    surfaceStrong: "#292c29",
    grainImage: expect.stringContaining("paper-grain.svg"),
    grainOpacity: "0.035",
    grainBlend: "screen",
    themeColor: "#1b1d1b",
  });
});

test("theme reveal stays anchored across Chrome zoom levels", async ({ page, isMobile }) => {
  test.skip(isMobile, "Browser zoom coverage uses the desktop browser profile");

  for (const zoom of [0.8, 1, 1.25, 1.5]) {
    await page.goto("/");
    const expected = await page.getByTestId("theme-toggle").evaluate((element, scale) => {
      document.documentElement.style.zoom = String(scale);
      const bounds = element.getBoundingClientRect();
      return {
        x: ((bounds.left + bounds.width / 2) / window.innerWidth) * 100,
        y: ((bounds.top + bounds.height / 2) / window.innerHeight) * 100,
      };
    }, zoom);

    await page.getByTestId("theme-toggle").evaluate((element) => (element as HTMLElement).click());
    await page.waitForFunction(() =>
      document.getAnimations().some((animation) =>
        (animation.effect as KeyframeEffect | null)?.pseudoElement === "::view-transition-new(root)"
      ),
    );
    const keyframes = await page.evaluate(() => {
      const animation = document.getAnimations().find((candidate) =>
        (candidate.effect as KeyframeEffect | null)?.pseudoElement === "::view-transition-new(root)"
      );
      return (animation?.effect as KeyframeEffect | null)?.getKeyframes()
        .map((frame) => frame.clipPath)
        .filter((clipPath): clipPath is string => typeof clipPath === "string") ?? [];
    });
    expect(keyframes).toHaveLength(6);
    for (const clipPath of keyframes) {
      const match = clipPath.match(/circle\(([\d.]+)% at ([\d.]+)% ([\d.]+)%\)/);
      if (!match) throw new Error(`Zoom ${zoom} used a non-relative reveal: ${clipPath}`);
      expect(Math.abs(Number(match[2]) - expected.x)).toBeLessThan(0.1);
      expect(Math.abs(Number(match[3]) - expected.y)).toBeLessThan(0.1);
    }
  }
});

test("home work stage rebounds small input and advances decisive input", async ({ page, isMobile }) => {
  test.skip(isMobile, "The work-stage controller is a desktop interaction");

  await page.goto("/");
  await expect(page.locator("[data-inspection-stage]")).toHaveCount(0);
  const freeformEntry = page.locator("[data-work-entry=freeform-artifacts]");
  const fiascoEntry = page.locator("[data-work-entry=fiasco]");
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
  await expect(page.locator("[data-work-frame=fiasco]")).not.toHaveClass(/is-active/);
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
  await expect(page.locator("[data-work-frame=fiasco]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-frame=towerlab]")).not.toHaveClass(/is-active/);
  await expect(page.locator("html")).not.toHaveClass(/is-work-animating/);
  const finalCenterError = await fiascoEntry.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
  });
  expect(finalCenterError).toBeLessThan(1);
});

test("work stage accepts deliberate reversal without mistaking momentum for intent", async ({ page, isMobile }) => {
  test.skip(isMobile, "The work-stage controller is a desktop interaction");

  const centerFreeform = async () => {
    await page.goto("/");
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
  await expect(page.locator("[data-work-frame=fiasco]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-stage]")).toHaveAttribute("data-work-navigation-state", "idle");
  await expect
    .poll(() => page.locator("[data-work-entry=fiasco]").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
    }))
    .toBeLessThan(1);
});

test("keyboard navigation advances exactly one centered project", async ({ page, isMobile }) => {
  test.skip(isMobile, "The work-stage controller is a desktop interaction");

  await page.goto("/");
  const entry = (slug: string) => page.locator(`[data-work-entry=${slug}]`);
  await entry("freeform-artifacts").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect
    .poll(() => entry("freeform-artifacts").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
    }))
    .toBeLessThan(1);

  for (const [key, slug] of [
    ["ArrowDown", "fiasco"],
    ["ArrowDown", "towerlab"],
    ["ArrowUp", "fiasco"],
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
    await page.goto("/");
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

  await page.goto("/");
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
    const heading = document.querySelector<HTMLElement>(".work-heading")!.getBoundingClientRect();
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

  await page.goto("/");
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
  expect(pointerHit).toBe("fiasco");
  await expect(page.locator("[data-work-frame=freeform-artifacts]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-frame=fiasco]")).not.toHaveClass(/is-active/);
  await expect(firstEntry).toHaveClass(/is-active/);
});

test("reduced motion keeps theme and work changes immediate", async ({ page, isMobile }) => {
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

test("project and note routes render real content", async ({ page }) => {
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
  await page.getByRole("link", { name: "Rebuilding a personal site around working software" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Local-first demos" })).toBeVisible();
});

test("mobile layouts do not overflow the viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile project only");

  for (const route of ["/", "/projects/", "/projects/freeform-artifacts/", "/notes/rebuilding-the-site/"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
  }
});
