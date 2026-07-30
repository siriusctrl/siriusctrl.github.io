import { expect, test } from "@playwright/test";

type ElementGeometry = {
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
  font: {
    family: string;
    size: string;
    weight: string;
    lineHeight: string;
    letterSpacing: string;
  };
  lineBoxes: number;
};

type GeometryPair = {
  original: ElementGeometry;
  clone: ElementGeometry;
};

const geometrySelectors = [
  ":scope > .site-header",
  ":scope > .site-header .wordmark",
  ":scope > .site-header nav",
  ":scope > .site-header nav > a:first-child",
  ":scope > .site-header .icon-button",
  ":scope > main",
  ":scope > main .home-intro",
  ":scope > main .home-byline",
  ":scope > main .home-intro h1",
  ":scope > main .home-intro h1 span",
  ":scope > main .intro-bottom",
  ":scope > main .intro-statement",
  ":scope > main .threads-section .section-heading",
  ":scope > main .thread-row:first-child h3",
  ":scope > main .thread-row:first-child p",
];

test("4k classic-scrollbar reveal preserves viewport and typography geometry while scrolling", async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".home-byline, .home-intro h1, .intro-statement, .intro-links")]
      .every((element) => element.getAnimations().every((animation) =>
        animation.playState === "finished"
      ))
  );

  const initial = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
    rootScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    scrollX: window.scrollX,
  }));
  expect(initial.innerWidth).toBe(3840);
  expect(initial.innerWidth - initial.clientWidth).toBeGreaterThanOrEqual(10);
  expect(initial.rootScrollWidth).toBe(initial.clientWidth);
  expect(initial.bodyScrollWidth).toBe(initial.clientWidth);
  expect(initial.scrollX).toBe(0);

  await page.evaluate((selectors) => {
    const proof = {
      clickTime: Number.NaN,
      wheelTime: Number.NaN,
      animationTimeAtWheel: Number.NaN,
      sameLayerAtWheel: false,
      sameAnimationAtWheel: false,
      before: undefined as ReturnType<typeof readState> | undefined,
    };
    const proofWindow = window as typeof window & {
      __themeScrollbarProof?: typeof proof;
      __themeScrollbarReference?: { layer: HTMLElement; animation: Animation };
      __readThemeScrollbarState?: () => ReturnType<typeof readState>;
    };

    const readElement = (scope: ParentNode, selector: string): ElementGeometry => {
      const element = scope.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing geometry target: ${selector}`);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const range = document.createRange();
      range.selectNodeContents(element);
      const lineBoxes = [...range.getClientRects()].filter((box) =>
        box.width > 0 && box.height > 0
      ).length;
      return {
        selector,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        font: {
          family: style.fontFamily,
          size: style.fontSize,
          weight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
        },
        lineBoxes,
      };
    };

    function readState() {
      const layer = document.querySelector<HTMLElement>("[data-theme-render-layer]");
      const animation = layer?.getAnimations().find((candidate) => candidate.id === "theme-reveal");
      if (!layer || !animation) {
        throw new Error("Theme scrollbar state was read without an active reveal");
      }
      const layerRect = layer.getBoundingClientRect();
      const scaleX = layerRect.width / layer.offsetWidth;
      const scaleY = layerRect.height / layer.offsetHeight;
      const clipPath = getComputedStyle(layer).clipPath;
      const clipCenter = clipPath.match(/at\s+([\d.]+)px\s+([\d.]+)px/);
      const toggle = document.querySelector<HTMLElement>("body > .site-header .icon-button");
      if (!toggle) throw new Error("Theme toggle was unavailable");
      const toggleRect = toggle.getBoundingClientRect();
      return {
        metrics: {
          innerWidth: window.innerWidth,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
          rootScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          layerWidth: layerRect.width,
          layerHeight: layerRect.height,
          layerX: layerRect.x,
          layerY: layerRect.y,
        },
        origin: {
          x: layerRect.left + Number(clipCenter?.[1] ?? Number.NaN) * scaleX,
          y: layerRect.top + Number(clipCenter?.[2] ?? Number.NaN) * scaleY,
          toggleX: toggleRect.left + toggleRect.width / 2,
          toggleY: toggleRect.top + toggleRect.height / 2,
        },
        animation: {
          currentTime: Number(animation.currentTime),
          playState: animation.playState,
          rootTheme: document.documentElement.dataset.theme,
          layerTheme: layer.dataset.theme,
          active: document.documentElement.dataset.themeTransition,
          sameLayer: proofWindow.__themeScrollbarReference?.layer === layer,
          sameAnimation: proofWindow.__themeScrollbarReference?.animation === animation,
          viewTransitions: document.getAnimations().filter((candidate) =>
            (candidate.effect as KeyframeEffect | null)?.pseudoElement?.includes("view-transition")
          ).length,
        },
        pairs: selectors.map((selector): GeometryPair => ({
          original: readElement(document.body, selector),
          clone: readElement(layer, selector),
        })),
      };
    }

    proofWindow.__themeScrollbarProof = proof;
    proofWindow.__readThemeScrollbarState = readState;
    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    if (!toggle) throw new Error("Theme toggle was unavailable while installing proof");
    toggle.addEventListener("click", (event) => {
      proof.clickTime = event.timeStamp;
    }, { capture: true, once: true });
    toggle.addEventListener("click", () => {
      queueMicrotask(() => {
        const layer = document.querySelector<HTMLElement>("[data-theme-render-layer]");
        const animation = layer?.getAnimations().find((candidate) => candidate.id === "theme-reveal");
        if (!layer || !animation) return;
        proofWindow.__themeScrollbarReference = { layer, animation };
        proof.before = readState();
      });
    }, { once: true });
    window.addEventListener("wheel", (event) => {
      proof.wheelTime = event.timeStamp;
      const layer = document.querySelector<HTMLElement>("[data-theme-render-layer]");
      const animation = layer?.getAnimations().find((candidate) => candidate.id === "theme-reveal");
      proof.animationTimeAtWheel = Number(animation?.currentTime ?? Number.NaN);
      proof.sameLayerAtWheel = proofWindow.__themeScrollbarReference?.layer === layer;
      proof.sameAnimationAtWheel = proofWindow.__themeScrollbarReference?.animation === animation;
    }, { capture: true, once: true, passive: true });
  }, geometrySelectors);

  const toggle = page.getByTestId("theme-toggle");
  await toggle.click();
  await page.mouse.wheel(0, 900);

  const readEvidence = () => page.evaluate(() => {
    const proofWindow = window as typeof window & {
      __themeScrollbarProof?: {
        clickTime: number;
        wheelTime: number;
        animationTimeAtWheel: number;
        sameLayerAtWheel: boolean;
        sameAnimationAtWheel: boolean;
        before?: unknown;
      };
      __readThemeScrollbarState?: () => unknown;
    };
    return {
      proof: proofWindow.__themeScrollbarProof,
      after: proofWindow.__readThemeScrollbarState?.(),
    };
  }) as Promise<{
    proof?: {
      clickTime: number;
      wheelTime: number;
      animationTimeAtWheel: number;
      sameLayerAtWheel: boolean;
      sameAnimationAtWheel: boolean;
      before?: {
        metrics: Record<string, number>;
        origin: Record<string, number>;
        animation: Record<string, string | number | undefined>;
        pairs: GeometryPair[];
      };
    };
    after?: {
      metrics: Record<string, number>;
      origin: Record<string, number>;
      animation: Record<string, string | number | undefined>;
      pairs: GeometryPair[];
    };
  }>;

  await expect.poll(async () => {
    const evidence = await readEvidence();
    const beforeScroll = evidence.proof?.before?.metrics.scrollY;
    const afterScroll = evidence.after?.metrics.scrollY;
    return beforeScroll === undefined || afterScroll === undefined
      ? Number.NEGATIVE_INFINITY
      : afterScroll - beforeScroll;
  }).toBeGreaterThan(100);
  await expect.poll(async () => {
    const evidence = await readEvidence();
    const firstPair = evidence.after?.pairs.find((pair) =>
      pair.original.selector === ":scope > main .home-intro h1"
    );
    return firstPair
      ? Math.abs(firstPair.original.rect.x - firstPair.clone.rect.x)
      : Number.POSITIVE_INFINITY;
  }).toBeLessThan(0.1);

  const evidence = await readEvidence();
  const before = evidence.proof?.before;
  const after = evidence.after;
  if (!evidence.proof || !before || !after) throw new Error("4k scrollbar proof was incomplete");

  const assertAligned = (pairs: GeometryPair[]) => {
    for (const { original, clone } of pairs) {
      expect(clone.selector).toBe(original.selector);
      expect(Math.abs(clone.rect.x - original.rect.x), `${original.selector} x`).toBeLessThan(0.1);
      expect(Math.abs(clone.rect.y - original.rect.y), `${original.selector} y`).toBeLessThan(0.1);
      expect(
        Math.abs(clone.rect.width - original.rect.width),
        `${original.selector} width`,
      ).toBeLessThan(0.1);
      expect(
        Math.abs(clone.rect.height - original.rect.height),
        `${original.selector} height`,
      ).toBeLessThan(0.1);
      expect(clone.font, `${original.selector} font`).toEqual(original.font);
      expect(clone.lineBoxes, `${original.selector} line boxes`).toBe(original.lineBoxes);
    }
  };

  expect(evidence.proof.wheelTime - evidence.proof.clickTime).toBeGreaterThanOrEqual(0);
  expect(evidence.proof.wheelTime - evidence.proof.clickTime).toBeLessThan(100);
  expect(evidence.proof.animationTimeAtWheel).toBeGreaterThanOrEqual(0);
  expect(evidence.proof.animationTimeAtWheel).toBeLessThan(920);
  expect(evidence.proof.sameLayerAtWheel).toBe(true);
  expect(evidence.proof.sameAnimationAtWheel).toBe(true);

  for (const state of [before, after]) {
    expect(state.metrics.innerWidth - state.metrics.clientWidth).toBeGreaterThanOrEqual(10);
    expect(state.metrics.rootScrollWidth).toBe(initial.rootScrollWidth);
    expect(state.metrics.bodyScrollWidth).toBe(initial.bodyScrollWidth);
    expect(state.metrics.scrollX).toBe(0);
    expect(state.metrics.layerWidth).toBe(state.metrics.clientWidth);
    expect(state.metrics.layerHeight).toBeGreaterThanOrEqual(state.metrics.clientHeight);
    expect(Math.abs(state.origin.x - state.origin.toggleX)).toBeLessThan(0.1);
    expect(Math.abs(state.origin.y - before.origin.toggleY)).toBeLessThan(0.1);
    expect(state.animation.active).toBe("active");
    expect(state.animation.playState).toBe("running");
    expect(state.animation.rootTheme).toBe("light");
    expect(state.animation.layerTheme).toBe("dark");
    expect(state.animation.sameLayer).toBe(true);
    expect(state.animation.sameAnimation).toBe(true);
    expect(state.animation.viewTransitions).toBe(0);
    assertAligned(state.pairs);
  }
  expect(Math.abs(before.metrics.layerX)).toBeLessThan(0.1);
  expect(Math.abs(before.metrics.layerY)).toBeLessThan(0.1);
  expect(Math.abs(after.metrics.layerX + after.metrics.scrollX)).toBeLessThan(0.1);
  expect(Math.abs(after.metrics.layerY + after.metrics.scrollY)).toBeLessThan(0.1);
  expect(Number(after.animation.currentTime)).toBeGreaterThan(Number(before.animation.currentTime));

  await expect(page.locator("html")).not.toHaveAttribute("data-theme-transition", "active");
  await expect(page.locator("[data-theme-render-layer]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  const final = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    scrollX: window.scrollX,
  }));
  expect(final.rootScrollWidth).toBe(final.clientWidth);
  expect(final.bodyScrollWidth).toBe(final.clientWidth);
  expect(final.scrollX).toBe(0);
});

test("theme reveal mirrors the unfinished home entrance animation on every frame", async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/");

  const runningAtClick = await page.evaluate(() =>
    [...document.querySelectorAll(".home-byline, .home-intro h1, .intro-statement, .intro-links")]
      .flatMap((element) => element.getAnimations())
      .filter((animation) => animation.playState === "running" || animation.pending)
      .length
  );
  expect(runningAtClick).toBeGreaterThan(0);

  await page.evaluate(() => {
    const auditedSelectors = [
      ".home-byline",
      ".home-intro h1",
      ".intro-statement",
      ".intro-links",
    ];
    const proof = {
      done: false,
      samples: 0,
      activeEntranceSamples: 0,
      layerChanges: 0,
      missingPairs: 0,
      transformMismatches: 0,
      typographyMismatches: 0,
      maxRectDelta: 0,
      maxOpacityDelta: 0,
      firstAnimationTime: Number.NaN,
      lastAnimationTime: Number.NaN,
    };
    const proofWindow = window as typeof window & {
      __themeEntranceFrameProof?: typeof proof;
    };
    proofWindow.__themeEntranceFrameProof = proof;
    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    if (!toggle) throw new Error("Theme toggle was unavailable");

    toggle.addEventListener("click", () => {
      const referenceLayer =
        document.querySelector<HTMLElement>("[data-theme-render-layer]");
      if (!referenceLayer) throw new Error("Theme reveal was not created synchronously");

      const sample = () => {
        const layer = document.querySelector<HTMLElement>("[data-theme-render-layer]");
        if (!layer) {
          proof.done = true;
          return;
        }
        proof.samples += 1;
        if (layer !== referenceLayer) proof.layerChanges += 1;
        const revealAnimation = layer.getAnimations()
          .find((animation) => animation.id === "theme-reveal");
        const animationTime = Number(revealAnimation?.currentTime ?? Number.NaN);
        if (Number.isNaN(proof.firstAnimationTime)) proof.firstAnimationTime = animationTime;
        proof.lastAnimationTime = animationTime;

        for (const selector of auditedSelectors) {
          const original = document.body.querySelector<HTMLElement>(selector);
          const clone = layer.querySelector<HTMLElement>(selector);
          if (!original || !clone) {
            proof.missingPairs += 1;
            continue;
          }
          if (original.getAnimations().some((animation) =>
            animation.playState === "running" || animation.pending
          )) {
            proof.activeEntranceSamples += 1;
          }
          const originalRect = original.getBoundingClientRect();
          const cloneRect = clone.getBoundingClientRect();
          proof.maxRectDelta = Math.max(
            proof.maxRectDelta,
            Math.abs(originalRect.x - cloneRect.x),
            Math.abs(originalRect.y - cloneRect.y),
            Math.abs(originalRect.width - cloneRect.width),
            Math.abs(originalRect.height - cloneRect.height),
          );
          const originalStyle = getComputedStyle(original);
          const cloneStyle = getComputedStyle(clone);
          proof.maxOpacityDelta = Math.max(
            proof.maxOpacityDelta,
            Math.abs(Number(originalStyle.opacity) - Number(cloneStyle.opacity)),
          );
          if (originalStyle.transform !== cloneStyle.transform) {
            proof.transformMismatches += 1;
          }
          if (
            originalStyle.fontFamily !== cloneStyle.fontFamily
            || originalStyle.fontSize !== cloneStyle.fontSize
            || originalStyle.fontWeight !== cloneStyle.fontWeight
            || originalStyle.lineHeight !== cloneStyle.lineHeight
            || originalStyle.letterSpacing !== cloneStyle.letterSpacing
          ) {
            proof.typographyMismatches += 1;
          }
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { once: true });
  });

  await page.getByTestId("theme-toggle").evaluate((element) =>
    (element as HTMLElement).click()
  );
  await expect.poll(() => page.evaluate(() => {
    const proofWindow = window as typeof window & {
      __themeEntranceFrameProof?: { done: boolean };
    };
    return proofWindow.__themeEntranceFrameProof?.done;
  })).toBe(true);

  const proof = await page.evaluate(() => {
    const proofWindow = window as typeof window & {
      __themeEntranceFrameProof?: {
        done: boolean;
        samples: number;
        activeEntranceSamples: number;
        layerChanges: number;
        missingPairs: number;
        transformMismatches: number;
        typographyMismatches: number;
        maxRectDelta: number;
        maxOpacityDelta: number;
        firstAnimationTime: number;
        lastAnimationTime: number;
      };
    };
    return proofWindow.__themeEntranceFrameProof;
  });
  if (!proof) throw new Error("Home entrance frame proof was unavailable");
  expect(proof.samples).toBeGreaterThanOrEqual(8);
  expect(proof.activeEntranceSamples).toBeGreaterThan(0);
  expect(proof.layerChanges).toBe(0);
  expect(proof.missingPairs).toBe(0);
  expect(proof.transformMismatches).toBe(0);
  expect(proof.typographyMismatches).toBe(0);
  expect(proof.maxRectDelta).toBeLessThan(0.1);
  expect(proof.maxOpacityDelta).toBeLessThan(0.002);
  expect(proof.firstAnimationTime).toBeGreaterThanOrEqual(0);
  expect(proof.lastAnimationTime).toBeGreaterThan(proof.firstAnimationTime + 700);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("projects stage and reveal remain frame-aligned during keyboard navigation", async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem("siriusctrl.theme", "light"));
  await page.goto("/projects/");
  const firstEntry = page.locator(".work-entry").first();
  await firstEntry.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect.poll(() => firstEntry.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
  })).toBeLessThan(0.75);
  await expect(page.locator("[data-work-stage]")).toHaveAttribute(
    "data-work-navigation-state",
    "idle",
  );

  await page.evaluate(() => {
    const proof = {
      done: false,
      samples: 0,
      movingSamples: 0,
      activeIndexChanges: 0,
      layerChanges: 0,
      missingPairs: 0,
      classMismatches: 0,
      maxRectDelta: 0,
      maxOpacityDelta: 0,
      maxTransformDelta: 0,
      maxOriginDelta: 0,
      missingClipSamples: 0,
      animationChanges: 0,
      animationTimeRegressions: 0,
      maxHorizontalOverflow: 0,
      maxLayerWidthDelta: 0,
      scrollWidthChanges: 0,
      initialScrollY: window.scrollY,
      finalScrollY: window.scrollY,
      expectedOriginX: Number.NaN,
      expectedOriginY: Number.NaN,
      initialRootScrollWidth: document.documentElement.scrollWidth,
      initialBodyScrollWidth: document.body.scrollWidth,
      firstAnimationTime: Number.NaN,
      lastAnimationTime: Number.NaN,
      previousAnimationTime: Number.NaN,
      finishEvents: 0,
      finishAnimationTime: Number.NaN,
      finishAnimationEndTime: Number.NaN,
      finishAnimationProgress: Number.NaN,
      finishAnimationPlayState: "",
      finishAnimationIdentityMatched: false,
      revealStartedAt: Number.NaN,
      finishRecordedAt: Number.NaN,
      finishPlaybackRate: Number.NaN,
      previousActiveIndex: -1,
    };
    const proofWindow = window as typeof window & {
      __themeWorkFrameProof?: typeof proof;
    };
    proofWindow.__themeWorkFrameProof = proof;

    const matrixValues = (value: string) => {
      const matrix = value === "none"
        ? new DOMMatrixReadOnly()
        : new DOMMatrixReadOnly(value);
      return [
        matrix.m11, matrix.m12, matrix.m13, matrix.m14,
        matrix.m21, matrix.m22, matrix.m23, matrix.m24,
        matrix.m31, matrix.m32, matrix.m33, matrix.m34,
        matrix.m41, matrix.m42, matrix.m43, matrix.m44,
      ];
    };
    const selectors = [
      ".work-stage",
      ".work-visual-pin",
      ".work-visual-canvas",
    ];
    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    if (!toggle) throw new Error("Theme toggle was unavailable");
    const toggleBounds = toggle.getBoundingClientRect();
    proof.expectedOriginX = toggleBounds.left + toggleBounds.width / 2;
    proof.expectedOriginY = toggleBounds.top + toggleBounds.height / 2;
    proof.revealStartedAt = performance.now();
    toggle.click();
    const referenceLayer =
      document.querySelector<HTMLElement>("[data-theme-render-layer]");
    if (!referenceLayer) throw new Error("Theme reveal was not created synchronously");
    const referenceAnimation = referenceLayer.getAnimations()
      .find((animation) => animation.id === "theme-reveal");
    if (!referenceAnimation) throw new Error("Theme reveal animation was not created synchronously");
    referenceAnimation.addEventListener("finish", (event) => {
      const timing = referenceAnimation.effect?.getComputedTiming();
      proof.finishEvents += 1;
      proof.finishAnimationTime = Number(referenceAnimation.currentTime);
      proof.finishAnimationEndTime = Number(timing?.endTime);
      proof.finishAnimationProgress = Number(timing?.progress);
      proof.finishAnimationPlayState = referenceAnimation.playState;
      proof.finishAnimationIdentityMatched = event.target === referenceAnimation;
      proof.finishRecordedAt = performance.now();
      proof.finishPlaybackRate = referenceAnimation.playbackRate;
    }, { once: true });

    window.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      const samplePairs = (
        originals: HTMLElement[],
        clones: HTMLElement[],
      ) => {
        if (originals.length !== clones.length) {
          proof.missingPairs += Math.abs(originals.length - clones.length) || 1;
        }
        for (let index = 0; index < Math.min(originals.length, clones.length); index += 1) {
          const original = originals[index];
          const clone = clones[index];
          if (!original || !clone) continue;
          const originalRect = original.getBoundingClientRect();
          const cloneRect = clone.getBoundingClientRect();
          proof.maxRectDelta = Math.max(
            proof.maxRectDelta,
            Math.abs(originalRect.x - cloneRect.x),
            Math.abs(originalRect.y - cloneRect.y),
            Math.abs(originalRect.width - cloneRect.width),
            Math.abs(originalRect.height - cloneRect.height),
          );
          const originalStyle = getComputedStyle(original);
          const cloneStyle = getComputedStyle(clone);
          proof.maxOpacityDelta = Math.max(
            proof.maxOpacityDelta,
            Math.abs(Number(originalStyle.opacity) - Number(cloneStyle.opacity)),
          );
          const originalMatrix = matrixValues(originalStyle.transform);
          const cloneMatrix = matrixValues(cloneStyle.transform);
          for (let matrixIndex = 0; matrixIndex < originalMatrix.length; matrixIndex += 1) {
            proof.maxTransformDelta = Math.max(
              proof.maxTransformDelta,
              Math.abs(originalMatrix[matrixIndex]! - cloneMatrix[matrixIndex]!),
            );
          }
          if (original.className !== clone.className) proof.classMismatches += 1;
        }
      };

      const sample = () => {
        const layer = document.querySelector<HTMLElement>("[data-theme-render-layer]");
        if (!layer) {
          proof.finalScrollY = window.scrollY;
          proof.done = true;
          return;
        }
        proof.samples += 1;
        if (layer !== referenceLayer) proof.layerChanges += 1;
        if (Math.abs(window.scrollY - proof.initialScrollY) > 0.5) proof.movingSamples += 1;
        const layerBounds = layer.getBoundingClientRect();
        const scaleX = layerBounds.width / layer.offsetWidth;
        const scaleY = layerBounds.height / layer.offsetHeight;
        proof.maxLayerWidthDelta = Math.max(
          proof.maxLayerWidthDelta,
          Math.abs(layerBounds.width - document.documentElement.clientWidth),
        );
        proof.maxHorizontalOverflow = Math.max(
          proof.maxHorizontalOverflow,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.documentElement.clientWidth,
        );
        if (
          document.documentElement.scrollWidth !== proof.initialRootScrollWidth
          || document.body.scrollWidth !== proof.initialBodyScrollWidth
        ) {
          proof.scrollWidthChanges += 1;
        }
        const originalMain = document.body.querySelector<HTMLElement>(":scope > main");
        if (!originalMain) {
          proof.missingPairs += 1;
          requestAnimationFrame(sample);
          return;
        }
        const revealAnimation = layer.getAnimations()
          .find((animation) => animation.id === "theme-reveal");
        if (revealAnimation !== referenceAnimation) proof.animationChanges += 1;
        const animationTime = Number(revealAnimation?.currentTime ?? Number.NaN);
        if (Number.isNaN(proof.firstAnimationTime)) proof.firstAnimationTime = animationTime;
        if (
          !Number.isNaN(proof.previousAnimationTime)
          && animationTime + 0.1 < proof.previousAnimationTime
        ) {
          proof.animationTimeRegressions += 1;
        }
        proof.previousAnimationTime = animationTime;
        proof.lastAnimationTime = animationTime;
        const clipPath = getComputedStyle(layer).clipPath;
        const clipCenter = clipPath.match(
          /at\s+(-?(?:\d+\.?\d*|\.\d+))px\s+(-?(?:\d+\.?\d*|\.\d+))px/,
        );
        if (!clipCenter) {
          proof.missingClipSamples += 1;
        } else {
          const originX = layerBounds.left + Number(clipCenter[1]) * scaleX;
          const originY = layerBounds.top + Number(clipCenter[2]) * scaleY;
          proof.maxOriginDelta = Math.max(
            proof.maxOriginDelta,
            Math.abs(originX - proof.expectedOriginX),
            Math.abs(originY - proof.expectedOriginY),
          );
        }

        const activeIndex = [...originalMain.querySelectorAll(".work-entry")]
          .findIndex((entry) => entry.classList.contains("is-active"));
        if (
          proof.previousActiveIndex >= 0
          && activeIndex >= 0
          && activeIndex !== proof.previousActiveIndex
        ) {
          proof.activeIndexChanges += 1;
        }
        proof.previousActiveIndex = activeIndex;

        for (const selector of selectors) {
          const original = originalMain.querySelector<HTMLElement>(selector);
          const clone = layer.querySelector<HTMLElement>(selector);
          samplePairs(original ? [original] : [], clone ? [clone] : []);
        }
        samplePairs(
          [...originalMain.querySelectorAll<HTMLElement>(".work-frame")],
          [...layer.querySelectorAll<HTMLElement>(".work-frame")],
        );
        samplePairs(
          [...originalMain.querySelectorAll<HTMLElement>(".work-entry")],
          [...layer.querySelectorAll<HTMLElement>(".work-entry")],
        );
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { once: true });
  });

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => {
    const proofWindow = window as typeof window & {
      __themeWorkFrameProof?: { done: boolean };
    };
    return proofWindow.__themeWorkFrameProof?.done;
  })).toBe(true);
  await expect(page.locator("[data-work-stage]")).toHaveAttribute(
    "data-work-navigation-state",
    "idle",
  );

  const proof = await page.evaluate(() => {
    const proofWindow = window as typeof window & {
      __themeWorkFrameProof?: {
        done: boolean;
        samples: number;
        movingSamples: number;
        activeIndexChanges: number;
        layerChanges: number;
        missingPairs: number;
        classMismatches: number;
        maxRectDelta: number;
        maxOpacityDelta: number;
        maxTransformDelta: number;
        maxOriginDelta: number;
        missingClipSamples: number;
        animationChanges: number;
        animationTimeRegressions: number;
        maxHorizontalOverflow: number;
        maxLayerWidthDelta: number;
        scrollWidthChanges: number;
        initialScrollY: number;
        finalScrollY: number;
        expectedOriginX: number;
        expectedOriginY: number;
        firstAnimationTime: number;
        lastAnimationTime: number;
        finishEvents: number;
        finishAnimationTime: number;
        finishAnimationEndTime: number;
        finishAnimationProgress: number;
        finishAnimationPlayState: string;
        finishAnimationIdentityMatched: boolean;
        revealStartedAt: number;
        finishRecordedAt: number;
        finishPlaybackRate: number;
      };
    };
    return proofWindow.__themeWorkFrameProof;
  });
  if (!proof) throw new Error("Projects frame proof was unavailable");
  expect(proof.samples).toBeGreaterThanOrEqual(8);
  expect(proof.movingSamples).toBe(proof.samples);
  expect(proof.activeIndexChanges).toBeGreaterThan(0);
  expect(proof.layerChanges).toBe(0);
  expect(proof.missingPairs).toBe(0);
  expect(proof.classMismatches).toBe(0);
  expect(proof.maxRectDelta).toBeLessThan(0.1);
  expect(proof.maxOpacityDelta).toBeLessThan(0.002);
  expect(proof.maxTransformDelta).toBeLessThan(0.1);
  expect(proof.missingClipSamples).toBe(0);
  expect(proof.maxOriginDelta).toBeLessThan(0.1);
  expect(proof.animationChanges).toBe(0);
  expect(proof.animationTimeRegressions).toBe(0);
  expect(proof.maxHorizontalOverflow).toBe(0);
  expect(proof.maxLayerWidthDelta).toBeLessThan(0.1);
  expect(proof.scrollWidthChanges).toBe(0);
  expect(Number.isFinite(proof.expectedOriginX)).toBe(true);
  expect(Number.isFinite(proof.expectedOriginY)).toBe(true);
  expect(proof.finalScrollY - proof.initialScrollY).toBeGreaterThan(100);
  expect(proof.firstAnimationTime).toBeGreaterThanOrEqual(0);
  expect(proof.lastAnimationTime).toBeGreaterThan(proof.firstAnimationTime);
  expect(proof.finishEvents).toBe(1);
  expect(proof.finishAnimationIdentityMatched).toBe(true);
  expect(proof.finishAnimationPlayState).toBe("finished");
  expect(proof.finishAnimationEndTime).toBe(920);
  expect(proof.finishAnimationProgress).toBe(1);
  expect(proof.finishAnimationTime).toBeGreaterThanOrEqual(proof.finishAnimationEndTime);
  expect(proof.finishPlaybackRate).toBe(1);
  expect(proof.finishRecordedAt - proof.revealStartedAt).toBeGreaterThanOrEqual(880);
  await expect(page.locator(".work-entry").nth(1)).toHaveClass(/is-active/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
