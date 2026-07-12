import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEEDBACK_MS } from "./game";
import KeisanGamePage from "./page";

/**
 * テスト中に使うフェイクタイマー設定。
 *
 * 正誤表示・カウントダウン・経過時間表示のすべてが Date.now() と timer に依存するため、
 * Date も含めて fake にする。
 */
beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
    ],
  });
});

/**
 * テストごとの副作用を片付ける。
 *
 * localStorage の自己ベストとテーマ設定が次のテストへ漏れると初期画面の期待が変わるため毎回消す。
 */
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

/**
 * 画面上の演算記号から正答を計算するための表。
 *
 * UI と同じ記号を使い、テスト側が内部の `Problem` を覗かずにユーザー視点で回答できるようにする。
 */
const SYMBOL_CALC: Record<string, (a: number, b: number) => number> = {
  "＋": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => Math.floor(a / b),
};

/**
 * 現在表示されている式のテキストを返す。
 *
 * DOM 上の表示を検証の正本にし、内部状態へ依存しないテストにする。
 */
function equationText(): string {
  return screen.getByTestId("equation").textContent ?? "";
}

/**
 * 表示中の式を数値と記号へ分解する。
 *
 * ユーザーが見ている式から回答を組み立てることで、出題生成のランダム性をテストから切り離す。
 */
function readEquation(): { a: number; b: number; symbol: string } {
  /** `7 ＋ 3 =` のような表示から左辺2数と記号を抜き出した結果。 */
  const match = equationText().match(/(\d+)\s*([＋−×÷])\s*(\d+)\s*=/);
  if (!match) {
    throw new Error(`式を読み取れない: ${equationText()}`);
  }
  return { a: Number(match[1]), symbol: match[2], b: Number(match[3]) };
}

/**
 * 画面テンキーの指定キーを押す。
 *
 * テストを touch UI の data-testid に寄せ、キーボード入力とは別にテンキー経路を検証する。
 */
function tapKey(name: string) {
  fireEvent.click(screen.getByTestId(`key-${name}`));
}

/**
 * 複数桁の数字をテンキーで順番に入力する。
 *
 * ユーザーの連打に近い形で入力し、桁数制限や欄移動の挙動も通す。
 */
function tapDigits(digits: string) {
  for (const digit of digits) {
    tapKey(digit);
  }
}

/**
 * 単一答え欄の表示テキストを返す。
 *
 * 通常問題のテストだけが使い、あまりのあるわり算は専用 helper で2欄を読む。
 */
function answerText(): string {
  return screen.getByTestId("answer").textContent ?? "";
}

/**
 * 正誤フィードバックが閉じるまで fake timer を進める。
 *
 * 実時間待ちを避けつつ、`FEEDBACK_MS` と UI の自動遷移が同期していることを保つ。
 */
function advanceFeedback() {
  act(() => {
    vi.advanceTimersByTime(FEEDBACK_MS);
  });
}

/**
 * 指定条件でれんしゅうモードを開始する。
 *
 * ホーム画面の選択操作を通すことで、モード開始ボタンと state 初期化の両方を検証対象に含める。
 */
function startPractice(op = "add", level = "easy") {
  render(<KeisanGamePage />);
  fireEvent.click(screen.getByTestId(`op-${op}`));
  fireEvent.click(screen.getByTestId(`level-${level}`));
  fireEvent.click(screen.getByTestId("mode-practice"));
}

/**
 * 指定条件でタイムアタックを開始し、カウントダウンを完了させる。
 *
 * 3秒分の timer を進めてから検証を始め、プレイ画面の挙動だけに集中できる状態を作る。
 */
function startTimeAttack(op = "add", level = "easy", target = 10) {
  render(<KeisanGamePage />);
  fireEvent.click(screen.getByTestId(`op-${op}`));
  fireEvent.click(screen.getByTestId(`level-${level}`));
  fireEvent.click(screen.getByTestId(`mode-${target}`));
  for (let count = 0; count < 3; count++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

/**
 * 現在の問題(単一の答え)に正答し、正解表示を終える。
 *
 * れんしゅうとタイムアタックの成功経路で同じ DOM 操作を使い、内部 action を直接呼ばない。
 */
function solveOnce() {
  const { a, b, symbol } = readEquation();
  tapDigits(String(SYMBOL_CALC[symbol](a, b)));
  tapKey("submit");
  expect(screen.getByTestId("feedback").textContent).toContain("せいかい");
  advanceFeedback();
}

describe("ホーム画面 (US1)", () => {
  it("5つの演算・3つのレベル・れんしゅうとタイムアタックを選べる (FR-001/002/017)", () => {
    render(<KeisanGamePage />);
    for (const op of ["add", "sub", "mul", "div", "mix"]) {
      expect(screen.getByTestId(`op-${op}`)).toBeTruthy();
    }
    for (const level of ["easy", "normal", "hard"]) {
      expect(screen.getByTestId(`level-${level}`)).toBeTruthy();
    }
    expect(screen.getByTestId("mode-practice")).toBeTruthy();
    for (const target of [10, 30, 50]) {
      expect(screen.getByTestId(`mode-${target}`)).toBeTruthy();
    }
    expect(screen.queryByTestId("mode-100")).toBeNull();
  });

  it("演算とレベルの選択が aria-pressed で示される", () => {
    render(<KeisanGamePage />);
    expect(screen.getByTestId("op-add").getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByTestId("op-sub"));
    expect(screen.getByTestId("op-sub").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByTestId("op-add").getAttribute("aria-pressed")).toBe(
      "false",
    );
    fireEvent.click(screen.getByTestId("level-hard"));
    expect(screen.getByTestId("level-hard").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("モード選択中はゲーム用キーを横取りしない", () => {
    render(<KeisanGamePage />);
    // fireEvent は preventDefault されると false を返す。playing 以外では
    // フォーカス中ボタンの Enter 起動などブラウザ標準の操作を妨げないこと。
    expect(fireEvent.keyDown(window, { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(window, { key: "5" })).toBe(true);
    expect(fireEvent.keyDown(window, { key: "Backspace" })).toBe(true);
  });
});

describe("れんしゅうモード (US1)", () => {
  it("開始すると式・答え欄・テンキーが表示され、タイマーは出ない (FR-015)", () => {
    startPractice("sub");
    expect(equationText()).toMatch(/\d+\s*−\s*\d+\s*=/);
    expect(answerText()).toBe("");
    expect(screen.getByTestId("keypad")).toBeTruthy();
    expect(screen.queryByTestId("timer")).toBeNull();
    expect(screen.queryByTestId("progress")).toBeNull();
  });

  it("テンキーで入力・1文字削除・全消去ができる (FR-007)", () => {
    startPractice();
    tapDigits("12");
    expect(answerText()).toBe("12");
    tapKey("backspace");
    expect(answerText()).toBe("1");
    tapKey("clear");
    expect(answerText()).toBe("");
  });

  it("キーボードでも入力・確定・削除ができる (FR-009)", () => {
    startPractice();
    fireEvent.keyDown(window, { key: "7" });
    expect(answerText()).toBe("7");
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(answerText()).toBe("");
    const { a, b } = readEquation();
    for (const digit of String(a + b)) {
      fireEvent.keyDown(window, { key: digit });
    }
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByTestId("feedback").textContent).toContain("せいかい");
  });

  it("正解すると次の問題へ進み、答え欄が空になる (FR-013)", () => {
    startPractice();
    solveOnce();
    expect(answerText()).toBe("");
    expect(screen.queryByTestId("feedback")).toBeNull();
  });

  it("不正解では同じ問題のまま再挑戦できる (FR-012)", () => {
    startPractice();
    const before = equationText();
    const { a, b } = readEquation();
    tapDigits(String((a + b + 1) % 10));
    tapKey("submit");
    expect(screen.getByTestId("feedback").textContent).toContain("もういちど");
    advanceFeedback();
    expect(equationText()).toBe(before);
    expect(answerText()).toBe("");
  });

  it("かけざん・ミックスも出題される (FR-001/003)", () => {
    startPractice("mul");
    expect(equationText()).toMatch(/×/);
    solveOnce();
    fireEvent.click(screen.getByTestId("back-button"));
    fireEvent.click(screen.getByTestId("op-mix"));
    fireEvent.click(screen.getByTestId("mode-practice"));
    expect(equationText()).toMatch(/[＋−×÷]/);
  });
});

describe("あまりのあるわり算 (US1・FR-006)", () => {
  /**
   * あまりのあるわり算が出る条件でれんしゅうを開始する。
   *
   * div hard 以外では2欄入力にならないため、テスト条件を helper 名で固定する。
   */
  function startHardDivision() {
    startPractice("div", "hard");
  }

  /**
   * 商入力欄の表示値を返す。
   *
   * あまりのあるわり算では単一答え欄が存在しないため、専用の test id を読む。
   */
  function quotientText(): string {
    return screen.getByTestId("answer-quotient").textContent ?? "";
  }

  /**
   * あまり入力欄の表示値を返す。
   *
   * 商欄とは別にフォーカス・入力が切り替わることを検証するため、個別 helper にする。
   */
  function remainderText(): string {
    return screen.getByTestId("answer-remainder").textContent ?? "";
  }

  it("こたえ・あまりの2欄が表示され、選んだ欄に入力される", () => {
    startHardDivision();
    expect(screen.getByTestId("answer-quotient")).toBeTruthy();
    expect(screen.getByTestId("answer-remainder")).toBeTruthy();
    tapDigits("1");
    expect(quotientText()).toBe("1");
    fireEvent.click(screen.getByTestId("answer-remainder"));
    tapDigits("2");
    expect(remainderText()).toBe("2");
  });

  it("両欄がそろって初めて判定され、正答で正解になる", () => {
    startHardDivision();
    const { a, b } = readEquation();
    const quotient = Math.floor(a / b);
    const remainder = a % b;
    tapDigits(String(quotient));
    tapKey("submit"); // あまりが空なので判定されない
    expect(screen.queryByTestId("feedback")).toBeNull();
    fireEvent.click(screen.getByTestId("answer-remainder"));
    tapDigits(String(remainder));
    tapKey("submit");
    expect(screen.getByTestId("feedback").textContent).toContain("せいかい");
  });
});

describe("れんしゅうの成果 (US1・FR-016)", () => {
  it("おわると正解数をねぎらう表示が出て、ホームへ戻れる", () => {
    startPractice();
    solveOnce();
    fireEvent.click(screen.getByTestId("end-practice"));
    const summary = screen.getByTestId("practice-summary");
    expect(summary.textContent).toContain("1もん");
    fireEvent.click(screen.getByTestId("back-to-modes"));
    expect(screen.getByTestId("mode-practice")).toBeTruthy();
  });

  it("0もんで終了しても破綻しない", () => {
    startPractice();
    fireEvent.click(screen.getByTestId("end-practice"));
    expect(screen.getByTestId("practice-summary")).toBeTruthy();
  });
});

describe("タイムアタック (US2)", () => {
  /**
   * タイムアタック中の現在問題を解いて、正誤表示を閉じる。
   *
   * 各問で 100ms 進めることで、10問完了時の期待タイムを 1.0 秒に固定する。
   */
  function solveTimeAttackProblem() {
    const { a, b, symbol } = readEquation();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    tapDigits(String(SYMBOL_CALC[symbol](a, b)));
    tapKey("submit");
    expect(screen.getByTestId("feedback").textContent).toContain("せいかい");
    advanceFeedback();
  }

  it("カウントダウン後にHUDの進捗・タイマーを表示し、practice用の終了ボタンは出ない", () => {
    startTimeAttack("add", "easy", 10);
    expect(equationText()).toMatch(/\d+\s*＋\s*\d+\s*=/);
    expect(screen.getByTestId("progress")).toBeTruthy();
    expect(screen.getByTestId("timer").textContent).toContain("0.0");
    expect(screen.queryByTestId("end-practice")).toBeNull();
  });

  it("最終正解後に今回タイムと初回ベストを保存して表示する", () => {
    startTimeAttack("add", "easy", 10);
    for (let count = 0; count < 10; count++) {
      solveTimeAttackProblem();
    }
    expect(screen.getByTestId("result-time").textContent).toContain("1.0");
    expect(screen.getByTestId("result-best").textContent).toContain("はじめて");
    expect(localStorage.getItem("toys:keisan-game:best:add:easy:10")).toBe(
      JSON.stringify({ elapsedMs: 1000 }),
    );
  });

  it("既存ベストより速いと更新演出を表示し、記録を更新する", () => {
    localStorage.setItem(
      "toys:keisan-game:best:add:easy:10",
      JSON.stringify({ elapsedMs: 2000 }),
    );
    startTimeAttack("add", "easy", 10);
    for (let count = 0; count < 10; count++) {
      solveTimeAttackProblem();
    }
    expect(screen.getByTestId("result-best").textContent).toContain("2.0");
    expect(screen.getByTestId("result-new-record").textContent).toContain(
      "ベストこうしん",
    );
    expect(localStorage.getItem("toys:keisan-game:best:add:easy:10")).toBe(
      JSON.stringify({ elapsedMs: 1000 }),
    );
  });
});
