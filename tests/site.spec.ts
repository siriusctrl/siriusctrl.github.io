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
        ? clipPath.match(/at\s+([\d.]+)px\s+([\d.]+)px/)
        : null;
      return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
    });
    await expect.poll(readRevealOrigin).not.toBeNull();
    const revealOrigin = await readRevealOrigin();
    if (!revealOrigin) throw new Error("Theme reveal animation did not expose an origin");
    expect(Math.abs(revealOrigin.x - (themeToggleBounds!.x + themeToggleBounds!.width / 2))).toBeLessThan(2);
    expect(Math.abs(revealOrigin.y - (themeToggleBounds!.y + themeToggleBounds!.height / 2))).toBeLessThan(2);
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
      animation.effect?.pseudoElement === "::view-transition-new(root)"
    ),
  );
  const earlyFrame = await page.evaluate(async () => {
    const animation = document.getAnimations().find((candidate) =>
      candidate.effect?.pseudoElement === "::view-transition-new(root)"
    );
    if (!animation) return null;
    animation.pause();
    animation.currentTime = 180;
    await new Promise(requestAnimationFrame);
    return getComputedStyle(document.documentElement, "::view-transition-new(root)").clipPath;
  });
  const match = earlyFrame?.match(/circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)/);
  if (!match) throw new Error(`Unable to read the 4k reveal frame: ${earlyFrame}`);

  const [, radius, x, y] = match.map(Number);
  expect(radius).toBeLessThan(100);
  expect(Math.abs(x - (bounds.x + bounds.width / 2))).toBeLessThan(2);
  expect(Math.abs(y - (bounds.y + bounds.height / 2))).toBeLessThan(2);
});

test("home work stage snaps one project into focus per wheel step", async ({ page, isMobile }) => {
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
    .toBeLessThan(8);

  await page.mouse.wheel(0, 700);
  await expect(page.locator("[data-work-frame=towerlab]")).toHaveClass(/is-active/);
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
