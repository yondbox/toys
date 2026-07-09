import { expect, type Page, test } from "@playwright/test";

/**
 * けいさんゲームの主対象である縦向きスマートフォン viewport。
 *
 * レイアウト要件は 375×667 でスクロールなしに収まることなので、ファイル全体の既定にする。
 */
test.use({ viewport: { width: 375, height: 667 } });

/**
 * 画面上の演算記号から正答を計算するための表。
 *
 * Playwright では内部状態に触らず、ユーザーが見ている式だけから回答する方針にする。
 */
const SYMBOL_CALC: Record<string, (a: number, b: number) => number> = {
  "＋": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => Math.floor(a / b),
};

/**
 * 表示中の式を数値と演算記号へ分解する。
 *
 * ランダムに生成された問題でも、テストが DOM の表示を読んで正答できるようにする。
 */
async function readEquation(
  page: Page,
): Promise<{ a: number; b: number; symbol: string }> {
  /** 現在画面に表示されている式テキスト。 */
  const text = await page.getByTestId("equation").textContent();
  /** `7 ＋ 3 =` 形式から左辺2数と演算記号を抜き出した結果。 */
  const match = text?.match(/(\d+)\s*([＋−×÷])\s*(\d+)\s*=/);
  if (!match) {
    throw new Error(`式を読み取れない: ${text}`);
  }
  return { a: Number(match[1]), symbol: match[2], b: Number(match[3]) };
}

/**
 * 画面テンキーで複数桁を入力する。
 *
 * モバイル受け入れ条件では物理キーボードを使わないため、すべての回答を key button 経由にする。
 */
async function tapDigits(page: Page, digits: string) {
  for (const digit of digits) {
    await page.getByTestId(`key-${digit}`).click();
  }
}

/**
 * 画面テンキーだけ(キーボード不使用)で現在の問題に正答する。
 *
 * あまりのあるわり算だけ2欄入力へ分岐し、通常問題と同じ成功経路でフィードバック終了まで待つ。
 */
async function solveByTouch(page: Page) {
  const { a, b, symbol } = await readEquation(page);
  /** 現在の問題が商・あまりの2欄入力かどうか。 */
  const hasRemainder = (await page.getByTestId("answer-remainder").count()) > 0;
  if (hasRemainder) {
    await tapDigits(page, String(Math.floor(a / b)));
    await page.getByTestId("answer-remainder").click();
    await tapDigits(page, String(a % b));
  } else {
    await tapDigits(page, String(SYMBOL_CALC[symbol](a, b)));
  }
  await page.getByTestId("key-submit").click();
  await expect(page.getByTestId("feedback")).toContainText("せいかい");
  await expect(page.getByTestId("feedback")).toBeHidden({ timeout: 3000 });
}

/**
 * 指定条件でれんしゅうモードを開始する。
 *
 * URL 直打ちではなくホームの選択操作を通し、モード選択 UI も受け入れ条件に含める。
 */
async function startPractice(page: Page, op: string, level: string) {
  await page.goto("/keisan-game");
  await page.getByTestId(`op-${op}`).click();
  await page.getByTestId(`level-${level}`).click();
  await page.getByTestId("mode-practice").click();
}

/**
 * 指定条件でタイムアタックを開始し、最初の問題が表示されるまで待つ。
 *
 * カウントダウンは実時間に任せ、ユーザーが実際に見る開始フローを E2E で通す。
 */
async function startTimeAttack(
  page: Page,
  op: string,
  level: string,
  target: 10 | 30 | 50,
) {
  await page.goto("/keisan-game");
  await page.getByTestId(`op-${op}`).click();
  await page.getByTestId(`level-${level}`).click();
  await page.getByTestId(`mode-${target}`).click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 5000 });
}

test.describe("US1: タッチだけで四則演算を練習できる (SC-001/003)", () => {
  for (const op of ["add", "sub", "mul", "div", "mix"] as const) {
    test(`${op} をテンキーだけで解ける`, async ({ page }) => {
      await startPractice(page, op, "easy");
      await expect(page.getByTestId("timer")).toHaveCount(0);
      await solveByTouch(page);
      // 正解後は次の問題へ進み、答え欄が空に戻る
      await expect(page.getByTestId("answer")).toHaveText("");
    });
  }

  test("あまりのあるわり算を2欄で解ける (FR-006)", async ({ page }) => {
    await startPractice(page, "div", "hard");
    await expect(page.getByTestId("answer-quotient")).toBeVisible();
    await expect(page.getByTestId("answer-remainder")).toBeVisible();
    await solveByTouch(page);
  });

  test("おわると成果が表示される (FR-016)", async ({ page }) => {
    await startPractice(page, "add", "easy");
    await solveByTouch(page);
    await page.getByTestId("end-practice").click();
    await expect(page.getByTestId("practice-summary")).toContainText("1もん");
  });
});

test.describe("モバイル最適化 (FR-008/036/037)", () => {
  test("プレイ画面が375×667で縦スクロールなしに収まり、テンキーが見える (SC-010)", async ({
    page,
  }) => {
    await startPractice(page, "add", "easy");
    await expect(page.getByTestId("keypad")).toBeVisible();
    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    // テンキーが画面内に完全に見えている
    const keypad = await page.getByTestId("keypad").boundingBox();
    expect(keypad).not.toBeNull();
    if (keypad) {
      expect(keypad.y + keypad.height).toBeLessThanOrEqual(667 + 1);
    }
  });

  test("テンキーのタッチターゲットは48px以上 (FR-008)", async ({ page }) => {
    await startPractice(page, "add", "easy");
    for (const key of ["0", "5", "backspace", "clear", "submit"]) {
      const box = await page.getByTestId(`key-${key}`).boundingBox();
      expect(box, `key-${key} のサイズ`).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(48);
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
    }
  });
});

test.describe("US2: タイムアタックと自己ベスト (SC-006)", () => {
  test("10問タイムアタックの記録が保存され、別条件の記録を壊さない", async ({
    page,
  }) => {
    await page.goto("/keisan-game");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        "toys:keisan-game:best:sub:easy:10",
        JSON.stringify({ elapsedMs: 12345 }),
      );
    });

    await startTimeAttack(page, "add", "easy", 10);
    await expect(page.getByTestId("progress")).toBeVisible();
    await expect(page.getByTestId("timer")).toBeVisible();

    for (let count = 0; count < 10; count++) {
      await solveByTouch(page);
    }

    await expect(page.getByTestId("result-time")).toContainText("びょう");
    await expect(page.getByTestId("result-best")).toContainText("はじめて");

    const records = await page.evaluate(() => ({
      add: localStorage.getItem("toys:keisan-game:best:add:easy:10"),
      sub: localStorage.getItem("toys:keisan-game:best:sub:easy:10"),
    }));
    expect(records.add).toContain("elapsedMs");
    expect(records.sub).toBe(JSON.stringify({ elapsedMs: 12345 }));

    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("toys:keisan-game:best:add:easy:10"),
        ),
      )
      .not.toBeNull();
  });
});
