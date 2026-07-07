import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEEDBACK_MS } from "./game";
import AdditionGamePage from "./page";

// タイマー(カウントダウン・正誤表示・経過時間)と Date.now() を両方進めるため
// Date も含めてフェイクにする。
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

afterEach(() => {
  vi.useRealTimers();
});

function pressKey(key: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(window, { key, ...init });
}

function typeDigits(digits: string) {
  for (const digit of digits) {
    pressKey(digit);
  }
}

function equationText(): string {
  return screen.getByTestId("equation").textContent ?? "";
}

function readEquation(): { a: number; b: number } {
  const match = equationText().match(/(\d+) \+ (\d+) =/);
  if (!match) {
    throw new Error(`式を読み取れない: ${equationText()}`);
  }
  return { a: Number(match[1]), b: Number(match[2]) };
}

function answerText(): string {
  return screen.getByTestId("answer").textContent ?? "";
}

function advanceFeedback() {
  act(() => {
    vi.advanceTimersByTime(FEEDBACK_MS);
  });
}

function startFree() {
  render(<AdditionGamePage />);
  fireEvent.click(screen.getByTestId("mode-free"));
}

describe("フリーモード (US1)", () => {
  it("開始すると式と空の答え欄が大きく表示され、タイマーは出ない (FR-003/011)", () => {
    startFree();
    expect(equationText()).toMatch(/\d+ \+ \d+ =/);
    expect(answerText()).toBe("");
    expect(screen.queryByTestId("timer")).toBeNull();
    expect(screen.queryByTestId("progress")).toBeNull();
  });

  it("数字キーが即時に答え欄へ反映される (FR-004)", () => {
    startFree();
    typeDigits("12");
    expect(answerText()).toBe("12");
  });

  it("きほんでは3文字目の数字を受け付けない (FR-022)", () => {
    startFree();
    typeDigits("123");
    expect(answerText()).toBe("12");
  });

  it("Backspace は末尾1文字だけ消す。空なら何も起きない (FR-021)", () => {
    startFree();
    typeDigits("12");
    pressKey("Backspace");
    expect(answerText()).toBe("1");
    pressKey("Backspace");
    expect(answerText()).toBe("");
    pressKey("Backspace");
    expect(answerText()).toBe("");
  });

  it("Escape は答えを全消去し、問題は変わらない (FR-006)", () => {
    startFree();
    const equation = equationText();
    typeDigits("12");
    pressKey("Escape");
    expect(answerText()).toBe("");
    expect(equationText()).toBe(equation);
  });

  it("正解すると〇とせいかいを表示し、別の問題へ進む (FR-008/019/020)", () => {
    startFree();
    const equation = equationText();
    const { a, b } = readEquation();
    typeDigits(String(a + b));
    pressKey("Enter");
    const feedback = screen.getByTestId("feedback");
    expect(feedback.textContent).toContain("〇");
    expect(feedback.textContent).toContain("せいかい");
    advanceFeedback();
    expect(screen.queryByTestId("feedback")).toBeNull();
    expect(equationText()).not.toBe(equation);
    expect(answerText()).toBe("");
  });

  it("誤答すると×ともういちどを表示し、同じ問題に空欄で戻る (FR-009/019)", () => {
    startFree();
    const equation = equationText();
    typeDigits("99");
    pressKey("Enter");
    const feedback = screen.getByTestId("feedback");
    expect(feedback.textContent).toContain("×");
    expect(feedback.textContent).toContain("もういちど");
    advanceFeedback();
    expect(equationText()).toBe(equation);
    expect(answerText()).toBe("");
  });

  it("正誤表示中の Enter 連打で判定が重複しない (FR-010)", () => {
    startFree();
    const { a, b } = readEquation();
    typeDigits(String(a + b));
    pressKey("Enter");
    pressKey("Enter");
    pressKey("Enter");
    advanceFeedback();
    expect(screen.queryByTestId("feedback")).toBeNull();
    expect(answerText()).toBe("");
  });

  it("空欄で Enter を押しても判定しない (FR-007)", () => {
    startFree();
    pressKey("Enter");
    expect(screen.queryByTestId("feedback")).toBeNull();
  });

  it("修飾キー付きの数字と数字以外のキーは無視する", () => {
    startFree();
    pressKey("5", { ctrlKey: true });
    pressKey("5", { metaKey: true });
    pressKey("a");
    expect(answerText()).toBe("");
  });

  it("もどるボタンでモード選択へ戻る (FR-017)", () => {
    startFree();
    fireEvent.click(screen.getByTestId("back-button"));
    expect(screen.getByTestId("mode-free")).toBeDefined();
    expect(screen.queryByTestId("equation")).toBeNull();
  });
});

function startTimeAttack10() {
  render(<AdditionGamePage />);
  fireEvent.click(screen.getByTestId("mode-10"));
}

function advanceCountdown() {
  // カウントダウンは1秒タイマーの連鎖なので、act 境界で effect を
  // フラッシュさせるため1秒ずつ進める。
  for (let i = 0; i < 3; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

function solveCurrent() {
  const { a, b } = readEquation();
  typeDigits(String(a + b));
  pressKey("Enter");
  advanceFeedback();
}

function progressText(): string {
  return screen.getByTestId("progress").textContent ?? "";
}

function timerText(): string {
  return screen.getByTestId("timer").textContent ?? "";
}

describe("タイムアタック (US2)", () => {
  it("開始で 3→2→1 のカウントダウン後に問題・進捗・タイマーが出る (FR-012/013/014)", () => {
    startTimeAttack10();
    expect(screen.getByTestId("countdown-number").textContent).toBe("3");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("countdown-number").textContent).toBe("2");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("countdown-number").textContent).toBe("1");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("countdown-number")).toBeNull();
    expect(equationText()).toMatch(/\d+ \+ \d+ =/);
    expect(progressText()).toBe("0 / 10もん");
    expect(timerText()).toBe("0.0びょう");
  });

  it("タイマー表示は 0.1 秒刻みで進む (FR-014)", () => {
    startTimeAttack10();
    advanceCountdown();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(timerText()).toBe("0.1びょう");
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(timerText()).toBe("1.3びょう");
  });

  it("カウントダウン中の数字・Enter はゲーム状態に影響しない (FR-012)", () => {
    startTimeAttack10();
    typeDigits("12");
    pressKey("Enter");
    advanceCountdown();
    expect(answerText()).toBe("");
    expect(progressText()).toBe("0 / 10もん");
  });

  it("正解で進捗が増え、誤答では増えない (FR-015)", () => {
    startTimeAttack10();
    advanceCountdown();
    solveCurrent();
    expect(progressText()).toBe("1 / 10もん");
    typeDigits("99");
    pressKey("Enter");
    expect(screen.getByTestId("feedback").textContent).toContain("もういちど");
    advanceFeedback();
    expect(progressText()).toBe("1 / 10もん");
  });

  it("正誤表示中の Enter 連打で進捗が重複しない (FR-010)", () => {
    startTimeAttack10();
    advanceCountdown();
    const { a, b } = readEquation();
    typeDigits(String(a + b));
    pressKey("Enter");
    pressKey("Enter");
    pressKey("Enter");
    advanceFeedback();
    expect(progressText()).toBe("1 / 10もん");
  });

  it("10問完走で結果を表示し、再挑戦でカウントダウンから再開する (FR-016/024)", () => {
    startTimeAttack10();
    advanceCountdown();
    for (let i = 0; i < 10; i++) {
      solveCurrent();
    }
    expect(screen.getByTestId("result-count").textContent).toContain("10もん");
    expect(screen.getByTestId("result-time").textContent).toMatch(
      /きろく: \d+\.\dびょう/,
    );
    fireEvent.click(screen.getByTestId("retry"));
    expect(screen.getByTestId("countdown-number").textContent).toBe("3");
  });

  it("結果画面からモード選択へ戻れる (FR-016/017)", () => {
    startTimeAttack10();
    advanceCountdown();
    for (let i = 0; i < 10; i++) {
      solveCurrent();
    }
    fireEvent.click(screen.getByTestId("back-to-modes"));
    expect(screen.getByTestId("mode-free")).toBeDefined();
  });
});

describe("じょうきゅう難易度 (US3)", () => {
  it("難易度の選択状態が aria-pressed で判別できる (FR-001)", () => {
    render(<AdditionGamePage />);
    const basic = screen.getByTestId("difficulty-basic");
    const advanced = screen.getByTestId("difficulty-advanced");
    expect(basic.getAttribute("aria-pressed")).toBe("true");
    expect(advanced.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(advanced);
    expect(basic.getAttribute("aria-pressed")).toBe("false");
    expect(advanced.getAttribute("aria-pressed")).toBe("true");
  });

  it("じょうきゅうのフリーモードは2桁同士を出題する (FR-002)", () => {
    render(<AdditionGamePage />);
    fireEvent.click(screen.getByTestId("difficulty-advanced"));
    fireEvent.click(screen.getByTestId("mode-free"));
    const { a, b } = readEquation();
    expect(a).toBeGreaterThanOrEqual(10);
    expect(b).toBeGreaterThanOrEqual(10);
  });

  it("じょうきゅうでは3桁入力でき、4桁目は無視される (FR-022)", () => {
    render(<AdditionGamePage />);
    fireEvent.click(screen.getByTestId("difficulty-advanced"));
    fireEvent.click(screen.getByTestId("mode-free"));
    typeDigits("1988");
    expect(answerText()).toBe("198");
  });

  it("じょうきゅうのタイムアタックを完走し、再挑戦してもじょうきゅうのまま (FR-024)", () => {
    render(<AdditionGamePage />);
    fireEvent.click(screen.getByTestId("difficulty-advanced"));
    fireEvent.click(screen.getByTestId("mode-10"));
    advanceCountdown();
    for (let i = 0; i < 10; i++) {
      solveCurrent();
    }
    expect(screen.getByTestId("result-count").textContent).toContain("10もん");
    fireEvent.click(screen.getByTestId("retry"));
    advanceCountdown();
    const { a, b } = readEquation();
    expect(a).toBeGreaterThanOrEqual(10);
    expect(b).toBeGreaterThanOrEqual(10);
  });

  it("きほんに戻すと1桁同士に戻る (FR-002)", () => {
    render(<AdditionGamePage />);
    fireEvent.click(screen.getByTestId("difficulty-advanced"));
    fireEvent.click(screen.getByTestId("difficulty-basic"));
    fireEvent.click(screen.getByTestId("mode-free"));
    const { a, b } = readEquation();
    expect(a).toBeLessThanOrEqual(9);
    expect(b).toBeLessThanOrEqual(9);
  });
});
