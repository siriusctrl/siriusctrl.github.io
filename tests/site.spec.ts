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

  await page.getByTestId("theme-toggle").click();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await page.reload();
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
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
