import { expect, test } from "@playwright/test";

test("WebKit reveal uses explicit old and next-theme SVG assets in both directions", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "webkit", "Explicit SVG switching is a WebKit regression test");

  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/projects/");
  const original = page.locator("body > main [data-work-frame=freeform-artifacts] img");
  await expect(original).toHaveAttribute(
    "src",
    "/media/portraits/freeform-artifacts-light.svg",
  );

  const samplePaper = (selector: string) => page.locator(selector).first().evaluate(async (element) => {
    const image = element as HTMLImageElement;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("WebKit SVG regression test could not create a canvas context");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return Array.from(context.getImageData(10, 10, 1, 1).data);
  });

  const verifyDirection = async ({
    rootTheme,
    layerTheme,
    originalPixel,
    layerPixel,
    finalSource,
  }: {
    rootTheme: "light" | "dark";
    layerTheme: "light" | "dark";
    originalPixel: number[];
    layerPixel: number[];
    finalSource: string;
  }) => {
    const activeState = await page.getByTestId("theme-toggle").evaluate((element) => {
      (element as HTMLElement).click();
      const layer = document.querySelector<HTMLElement>("[data-theme-render-layer]");
      const circle =
        layer?.querySelector<SVGCircleElement>("[data-theme-reveal-circle]");
      const animation = circle?.getAnimations()
        .find((candidate) => candidate.id === "theme-reveal");
      const style = layer ? getComputedStyle(layer) : undefined;
      return {
        active: document.documentElement.dataset.themeTransition,
        rootTheme: document.documentElement.dataset.theme,
        layerTheme: layer?.dataset.theme,
        animationTime: Number(animation?.currentTime ?? -1),
        radius: Number.parseFloat(circle ? getComputedStyle(circle).r : ""),
        maskImage: style?.maskImage,
        clipPath: style?.clipPath,
      };
    });
    expect(activeState.active).toBe("active");
    expect(activeState.rootTheme).toBe(rootTheme);
    expect(activeState.layerTheme).toBe(layerTheme);
    expect(activeState.animationTime).toBeGreaterThanOrEqual(0);
    expect(activeState.animationTime).toBeLessThan(920);
    expect(activeState.radius).toBeGreaterThan(0);
    expect(activeState.maskImage).toBe("none");
    expect(activeState.clipPath).toContain("theme-reveal-clip");

    const layer = page.locator("[data-theme-render-layer]");
    await expect(layer).toBeVisible();
    await expect.poll(() => layer.evaluate((element) => {
      const circle =
        element.querySelector<SVGCircleElement>("[data-theme-reveal-circle]");
      return Number.parseFloat(circle ? getComputedStyle(circle).r : "");
    })).toBeGreaterThan(activeState.radius);
    const clonedArtwork = layer.locator(".work-frame img").first();
    await expect(clonedArtwork).toHaveAttribute(
      "src",
      `/media/portraits/freeform-artifacts-${layerTheme}.svg`,
    );
    await expect.poll(() => samplePaper("body > main [data-work-frame=freeform-artifacts] img"))
      .toEqual(originalPixel);
    await expect.poll(() =>
      samplePaper("[data-theme-render-layer] .work-frame img")
    ).toEqual(layerPixel);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition", "active");
    await expect(original).toHaveAttribute("src", finalSource);
    await expect.poll(() => samplePaper("body > main [data-work-frame=freeform-artifacts] img"))
      .toEqual(layerPixel);
  };

  await verifyDirection({
    rootTheme: "light",
    layerTheme: "dark",
    originalPixel: [239, 238, 233, 255],
    layerPixel: [26, 29, 27, 255],
    finalSource: "/media/portraits/freeform-artifacts-dark.svg",
  });
  await verifyDirection({
    rootTheme: "dark",
    layerTheme: "light",
    originalPixel: [26, 29, 27, 255],
    layerPixel: [239, 238, 233, 255],
    finalSource: "/media/portraits/freeform-artifacts-light.svg",
  });
});

test("WebKit initializes article SVGs from stored dark theme even when the OS is light", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "webkit", "Explicit SVG switching is a WebKit regression test");

  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    window.localStorage.setItem("siriusctrl.language", "en");
    window.localStorage.setItem("siriusctrl.theme", "dark");
  });
  await page.goto("/notes/context-not-control/");
  const themedImages = page.locator(
    "body > main img[data-theme-src-light][data-theme-src-dark]",
  );
  await expect(themedImages).toHaveCount(3);
  for (const image of await themedImages.all()) {
    await expect(image).toHaveAttribute("src", /-dark\.svg$/);
    await expect(image).toHaveCSS("visibility", "visible");
    await expect.poll(() => image.evaluate(async (element) => {
      const media = element as HTMLImageElement;
      await media.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1000;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("WebKit article SVG test could not create a canvas context");
      context.drawImage(media, 0, 0, canvas.width, canvas.height);
      return Array.from(context.getImageData(10, 10, 1, 1).data);
    })).toEqual([26, 29, 27, 255]);
  }
});
