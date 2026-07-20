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
  test.skip(isMobile, "Sticky work-stage snapping is a desktop interaction");

  await page.goto("/");
  await expect(page.locator("[data-inspection-stage]")).toHaveCount(0);
  const freeformEntry = page.locator("[data-work-entry=freeform-artifacts]");
  const towerLabEntry = page.locator("[data-work-entry=towerlab]");
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
  await expect(page.locator("[data-work-frame=towerlab]")).not.toHaveClass(/is-active/);
  expect(Math.abs(await page.evaluate(() => window.scrollY) - centeredScrollY)).toBeLessThan(1);
  await expect
    .poll(() =>
      freeformEntry.evaluate((element) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)),
    )
    .toBeLessThan(0.5);

  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(120);
  await page.mouse.wheel(0, 180);
  await expect(page.locator("[data-work-frame=towerlab]")).toHaveClass(/is-active/);
  await expect(page.locator("[data-work-frame=fmtview]")).not.toHaveClass(/is-active/);
  await expect
    .poll(() =>
      towerLabEntry.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
      }),
    )
    .toBeLessThan(8);
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
