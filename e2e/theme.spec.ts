import { expect, type Page, test } from "@playwright/test";

/**
 * `html[data-theme]` が期待するテーマになっていることを確認する。
 *
 * CSS の見た目ではなく、アプリがテーマ切替の正本として使う DOM 属性を検証する。
 */
async function expectTheme(page: Page, theme: "light" | "dark") {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

/**
 * ページに横スクロールが発生していないことを確認する。
 *
 * 375px 幅のモバイル表示で UI がはみ出す退行を、ページ内容に依存せず共通に検出する。
 */
async function expectNoHorizontalScroll(page: Page) {
  /** document 幅と viewport 幅の比較に必要なレイアウト値。 */
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

test.describe("テーマ初期化 (SC-007)", () => {
  test.use({ colorScheme: "dark" });

  test("未保存時はOSのダーク設定に従う", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectTheme(page, "dark");
  });
});

test.describe("テーマ切替と保存 (SC-008)", () => {
  test.use({ colorScheme: "light" });

  test("トップ・counter・keisan-game を横断して反映され、再読み込みで保持される", async ({
    page,
  }) => {
    await page.goto("/");
    await expectTheme(page, "light");

    await page.getByTestId("theme-toggle").click();
    await expectTheme(page, "dark");
    await expect(
      page.evaluate(() => localStorage.getItem("toys:theme")),
    ).resolves.toBe("dark");

    for (const path of ["/counter", "/keisan-game"]) {
      await page.goto(path);
      await expectTheme(page, "dark");
    }

    await page.reload();
    await expectTheme(page, "dark");
  });

  test("theme toggle は toys: 名前空間だけを書き込み、他キーを壊さない", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("external:key", "keep"));
    await page.getByTestId("theme-toggle").click();

    const storageState = await page.evaluate(() => ({
      external: localStorage.getItem("external:key"),
      keys: Object.keys(localStorage),
    }));
    expect(storageState.external).toBe("keep");
    expect(storageState.keys.filter((key) => key !== "external:key")).toEqual([
      "toys:theme",
    ]);
  });
});

test.describe("横スクロールなし (SC-011)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  for (const path of ["/", "/counter", "/keisan-game"] as const) {
    test(`${path} は幅375pxで横スクロールしない`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    });
  }
});
