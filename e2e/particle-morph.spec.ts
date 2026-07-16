import { expect, type Page, test } from "@playwright/test";

/**
 * モーフィングの巡回順に表示されるラベル。
 *
 * `SHAPE_SEQUENCE` と `SHAPES` の対応をブラウザ操作で確認するため、順序変更時は同期する。
 */
const SHAPE_LABELS = [
  "きゅうたい",
  "むすびめ",
  "ぎんが",
  "なみ",
  "もじ「あっ」",
] as const;

/**
 * Playwright ページで発生した console error と pageerror を収集する。
 *
 * @param page - 監視対象の Playwright ページ。
 * @returns テスト終了時に検査するエラーメッセージ配列。
 */
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

/**
 * canvas ホストの中央付近をクリックして次の造形へ進める。
 *
 * @param page - 操作対象の Playwright ページ。
 */
async function clickMorphSurface(page: Page) {
  await page.getByTestId("particle-canvas-host").click({
    position: { x: 240, y: 240 },
  });
}

test("US1: canvas appears and clicks cycle through all particle shapes", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/");
  await page.getByRole("link", { name: /パーティクル・モーフィング/ }).click();
  await expect(page).toHaveURL(/\/particle-morph$/);
  await expect(
    page.getByRole("heading", { name: "パーティクル・モーフィング" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  await expect(page.getByText(SHAPE_LABELS[0], { exact: true })).toBeVisible();
  await page.mouse.move(320, 260);
  await page.mouse.move(460, 300);
  await page.mouse.move(20, 20);

  await clickMorphSurface(page);
  await expect(page.getByText(SHAPE_LABELS[1], { exact: true })).toBeVisible();

  await clickMorphSurface(page);
  await page.waitForTimeout(200);
  await expect(page.getByText(SHAPE_LABELS[1], { exact: true })).toBeVisible();

  for (const label of SHAPE_LABELS.slice(2)) {
    await page.waitForTimeout(1900);
    await clickMorphSurface(page);
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  await page.waitForTimeout(1900);
  await clickMorphSurface(page);
  await expect(page.getByText(SHAPE_LABELS[0], { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("US1: WebGL unavailable shows the fallback message", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId,
      options,
    ) {
      if (contextId === "webgl" || contextId === "webgl2") {
        return null;
      }
      return originalGetContext.call(this, contextId, options);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto("/particle-morph");
  await expect(page.getByRole("status")).toContainText(
    "このブラウザでは 3D 表示を開始できませんでした。",
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("US3: idle canvas auto-advances to the next shape", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/particle-morph");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  await expect(page.getByText(SHAPE_LABELS[0], { exact: true })).toBeVisible();
  await expect(page.getByText(SHAPE_LABELS[1], { exact: true })).toBeVisible({
    timeout: 9500,
  });
  expect(consoleErrors).toEqual([]);
});

test("US4: theme switching updates the particle page without reload", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem("toys:theme", "dark");
  });

  await page.goto("/particle-morph");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe("dark");

  const pageRoot = page.getByTestId("particle-morph-page");
  const backgroundBefore = await pageRoot.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const navigationCount = await page.evaluate(
    () => performance.getEntriesByType("navigation").length,
  );

  await page.getByTestId("theme-toggle").click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe("light");
  await expect
    .poll(() =>
      pageRoot.evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(backgroundBefore);
  await expect(page.locator("canvas")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => performance.getEntriesByType("navigation").length),
    )
    .toBe(navigationCount);
  expect(consoleErrors).toEqual([]);
});

test("reduced-motion disables auto-advance while keeping manual morph", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/particle-morph");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  await expect(page.getByText(SHAPE_LABELS[0], { exact: true })).toBeVisible();
  await page.waitForTimeout(8500);
  await expect(page.getByText(SHAPE_LABELS[0], { exact: true })).toBeVisible();

  await clickMorphSurface(page);
  await expect(page.getByText(SHAPE_LABELS[1], { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("375px and rotated viewports keep the page free of horizontal scroll", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);

  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/particle-morph");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  const mobileMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(mobileMetrics.scrollWidth).toBeLessThanOrEqual(
    mobileMetrics.clientWidth + 1,
  );

  await page.setViewportSize({ width: 667, height: 375 });
  await expect(page.locator("canvas")).toBeVisible();
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(consoleErrors).toEqual([]);
});
