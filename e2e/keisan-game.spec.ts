import { expect, type Page, test } from "@playwright/test";

// たて向きスマートフォンを主対象に検証する (FR-036, SC-010)。
test.use({ viewport: { width: 375, height: 667 } });

const SYMBOL_CALC: Record<string, (a: number, b: number) => number> = {
  "＋": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => Math.floor(a / b),
};

async function readEquation(
  page: Page,
): Promise<{ a: number; b: number; symbol: string }> {
  const text = await page.getByTestId("equation").textContent();
  const match = text?.match(/(\d+)\s*([＋−×÷])\s*(\d+)\s*=/);
  if (!match) {
    throw new Error(`式を読み取れない: ${text}`);
  }
  return { a: Number(match[1]), symbol: match[2], b: Number(match[3]) };
}

async function tapDigits(page: Page, digits: string) {
  for (const digit of digits) {
    await page.getByTestId(`key-${digit}`).click();
  }
}

/** 画面テンキーだけ(キーボード不使用)で現在の問題に正答する。 */
async function solveByTouch(page: Page) {
  const { a, b, symbol } = await readEquation(page);
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

async function startPractice(page: Page, op: string, level: string) {
  await page.goto("/keisan-game");
  await page.getByTestId(`op-${op}`).click();
  await page.getByTestId(`level-${level}`).click();
  await page.getByTestId("mode-practice").click();
}

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
