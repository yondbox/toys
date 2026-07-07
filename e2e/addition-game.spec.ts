import { expect, type Locator, type Page, test } from "@playwright/test";

type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

async function readEquation(page: Page): Promise<{ a: number; b: number }> {
  const text = await page.getByTestId("equation").textContent();
  const match = text?.match(/(\d+) \+ (\d+) =/);
  if (!match) {
    throw new Error(`式を読み取れない: ${text}`);
  }
  return { a: Number(match[1]), b: Number(match[2]) };
}

/** 現在の問題に正答し、正解表示が消えるまで待つ。 */
async function solveOne(page: Page) {
  const { a, b } = await readEquation(page);
  await page.keyboard.type(String(a + b));
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback")).toContainText("せいかい");
  await expect(page.getByTestId("feedback")).toBeHidden({ timeout: 2000 });
}

async function visibleBox(
  locator: Locator,
  label: string,
): Promise<BoundingBox> {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} should have a bounding box`).not.toBeNull();
  return box as BoundingBox;
}

function expectWithinViewport(
  label: string,
  box: BoundingBox,
  viewport: { width: number; height: number },
) {
  expect(box.x, `${label} left edge`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${label} top edge`).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, `${label} right edge`).toBeLessThanOrEqual(
    viewport.width + 1,
  );
  expect(box.y + box.height, `${label} bottom edge`).toBeLessThanOrEqual(
    viewport.height + 1,
  );
}

function boxesOverlap(first: BoundingBox, second: BoundingBox): boolean {
  const horizontallyOverlap =
    first.x < second.x + second.width && second.x < first.x + first.width;
  const verticallyOverlap =
    first.y < second.y + second.height && second.y < first.y + first.height;
  return horizontallyOverlap && verticallyOverlap;
}

function expectNoOverlap(
  firstLabel: string,
  first: BoundingBox,
  secondLabel: string,
  second: BoundingBox,
) {
  expect(
    boxesOverlap(first, second),
    `${firstLabel} should not overlap ${secondLabel}`,
  ).toBe(false);
}

async function expectPlayingLayoutFits(page: Page) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const size = viewport ?? { width: 0, height: 0 };
  const backButton = await visibleBox(page.getByTestId("back-button"), "back");
  const hud = await visibleBox(page.getByTestId("hud"), "hud");
  const equation = await visibleBox(page.getByTestId("equation"), "equation");
  const answer = await visibleBox(page.getByTestId("answer"), "answer");

  for (const [label, box] of [
    ["back", backButton],
    ["hud", hud],
    ["equation", equation],
    ["answer", answer],
  ] as const) {
    expectWithinViewport(label, box, size);
  }

  expectNoOverlap("back", backButton, "hud", hud);
  expectNoOverlap("hud", hud, "equation", equation);
  expectNoOverlap("equation", equation, "answer", answer);
}

async function expectFeedbackLayoutFits(page: Page) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const size = viewport ?? { width: 0, height: 0 };
  const backButton = await visibleBox(page.getByTestId("back-button"), "back");
  const hud = await visibleBox(page.getByTestId("hud"), "hud");
  const feedback = await visibleBox(page.getByTestId("feedback"), "feedback");

  for (const [label, box] of [
    ["back", backButton],
    ["hud", hud],
    ["feedback", feedback],
  ] as const) {
    expectWithinViewport(label, box, size);
  }

  expectNoOverlap("back", backButton, "hud", hud);
  expectNoOverlap("hud", hud, "feedback", feedback);
}

test.describe("たしざんタイムアタック", () => {
  test("US1: フリーモードで練習できる", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /たしざんタイムアタック/ }).click();
    await expect(page).toHaveURL(/\/addition-game$/);

    await page.getByTestId("mode-free").click();
    await expect(page.getByTestId("equation")).toBeVisible();
    await expect(page.getByTestId("timer")).toHaveCount(0);

    // 正解すると別の問題へ進む (FR-008/020)
    const firstEquation = await page.getByTestId("equation").textContent();
    await solveOne(page);
    await expect(page.getByTestId("equation")).not.toHaveText(
      firstEquation ?? "",
    );

    // 誤答すると同じ問題に空欄で戻る (FR-009)
    const equation = await page.getByTestId("equation").textContent();
    await page.keyboard.type("99");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("feedback")).toContainText("もういちど");
    await expect(page.getByTestId("feedback")).toBeHidden({ timeout: 2000 });
    await expect(page.getByTestId("equation")).toHaveText(equation ?? "");
    await expect(page.getByTestId("answer")).toHaveText("");

    // Backspace は1文字削除、Escape は全消去 (FR-021/006)
    await page.keyboard.type("12");
    await page.keyboard.press("Backspace");
    await expect(page.getByTestId("answer")).toHaveText("1");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("answer")).toHaveText("");

    // もどるでモード選択へ (FR-017)
    await page.getByTestId("back-button").click();
    await expect(page.getByTestId("mode-free")).toBeVisible();
  });

  test("US2: 10問タイムアタックを完走し、レイアウトが不動のまま再挑戦できる", async ({
    page,
  }) => {
    await page.goto("/addition-game");
    await page.getByTestId("mode-10").click();

    // カウントダウン中 (FR-012)
    await expect(page.getByTestId("countdown-number")).toBeVisible();
    const backBoxCountdown = await page
      .getByTestId("back-button")
      .boundingBox();

    // カウントダウン終了 → 問題・進捗・タイマー (FR-013/014)
    await expect(page.getByTestId("equation")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("progress")).toHaveText("0 / 10もん");
    await expect(page.getByTestId("timer")).toHaveText(/\d+\.\dびょう/);
    const backBoxPlaying = await page.getByTestId("back-button").boundingBox();
    const hudBoxPlaying = await page.getByTestId("hud").boundingBox();

    // 1問目に正解し、正誤表示中のボックスを取得
    const { a, b } = await readEquation(page);
    await page.keyboard.type(String(a + b));
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("feedback")).toBeVisible();
    const backBoxFeedback = await page.getByTestId("back-button").boundingBox();
    const hudBoxFeedback = await page.getByTestId("hud").boundingBox();
    await expect(page.getByTestId("feedback")).toBeHidden({ timeout: 2000 });
    await expect(page.getByTestId("progress")).toHaveText("1 / 10もん");

    // 残り9問を完走 (FR-015/016)
    for (let i = 0; i < 9; i++) {
      await solveOne(page);
    }
    await expect(page.getByTestId("result-count")).toHaveText(
      "10もん せいかい！",
    );
    await expect(page.getByTestId("result-time")).toHaveText(
      /きろく: \d+\.\dびょう/,
    );
    const backBoxResult = await page.getByTestId("back-button").boundingBox();

    // SC-007: 全状態で戻るボタンと HUD の位置・寸法が変化しない (FR-023)
    expect(backBoxPlaying).toEqual(backBoxCountdown);
    expect(backBoxFeedback).toEqual(backBoxCountdown);
    expect(backBoxResult).toEqual(backBoxCountdown);
    expect(hudBoxFeedback).toEqual(hudBoxPlaying);

    // 再挑戦は同じ問題数でカウントダウンから (FR-016/024)
    await page.getByTestId("retry").click();
    await expect(page.getByTestId("countdown-number")).toBeVisible();
    await expect(page.getByTestId("equation")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("progress")).toHaveText("0 / 10もん");
  });

  test("US3: じょうきゅうで2桁同士の足し算に挑戦できる", async ({ page }) => {
    await page.goto("/addition-game");
    await page.getByTestId("difficulty-advanced").click();

    // フリーモードで2桁同士が出題され、3桁の答えを入力できる (FR-002/022)
    await page.getByTestId("mode-free").click();
    const { a, b } = await readEquation(page);
    expect(a).toBeGreaterThanOrEqual(10);
    expect(b).toBeGreaterThanOrEqual(10);
    await page.keyboard.type("1988");
    await expect(page.getByTestId("answer")).toHaveText("198");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("answer")).toHaveText("");
    await solveOne(page);
    await page.getByTestId("back-button").click();

    // 選んだ難易度のままタイムアタックを完走できる (FR-001)
    await expect(page.getByTestId("difficulty-advanced")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("mode-10").click();
    await expect(page.getByTestId("equation")).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 10; i++) {
      await solveOne(page);
    }
    await expect(page.getByTestId("result-count")).toHaveText(
      "10もん せいかい！",
    );

    // 再挑戦してもじょうきゅうのまま (FR-024)
    await page.getByTestId("retry").click();
    await expect(page.getByTestId("equation")).toBeVisible({ timeout: 5000 });
    const retried = await readEquation(page);
    expect(retried.a).toBeGreaterThanOrEqual(10);
    expect(retried.b).toBeGreaterThanOrEqual(10);
  });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 1440, height: 900 },
  ]) {
    test(`SC-006: ${viewport.width}px viewport keeps required play elements readable`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/addition-game");
      await page.getByTestId("difficulty-advanced").click();
      await page.getByTestId("mode-10").click();

      await expect(page.getByTestId("equation")).toBeVisible({
        timeout: 5000,
      });
      await page.keyboard.type("198");
      await expect(page.getByTestId("answer")).toHaveText("198");
      await expectPlayingLayoutFits(page);

      await page.keyboard.press("Escape");
      const { a, b } = await readEquation(page);
      await page.keyboard.type(String(a + b));
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("feedback")).toBeVisible();
      await expectFeedbackLayoutFits(page);
    });
  }
});
