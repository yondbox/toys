import { describe, expect, it } from "vitest";
import {
  type GameAction,
  type GameState,
  gameReducer,
  initialState,
} from "./game";
import type { Level, Operation, Problem } from "./operations";

/**
 * たし算の通常問題 fixture を作る。
 *
 * reducer の遷移テストでは出題生成のランダム性を排除し、入力と正誤判定だけを検証する。
 */
function singleProblem(a: number, b: number): Problem {
  return { op: "add", a, b, answer: { kind: "single", value: a + b } };
}

/**
 * 93 ÷ 7 = 13 あまり 2 の fixture を返す。
 *
 * 2欄入力の reducer 分岐を通常の単一答え問題から独立して検証するために固定値を使う。
 */
function remainderProblem(): Problem {
  return {
    op: "div",
    a: 93,
    b: 7,
    answer: { kind: "quotient-remainder", quotient: 13, remainder: 2 },
  };
}

/**
 * 複数 action を順番に reducer へ流す。
 *
 * reducer の状態遷移テストで、ユーザー操作の連続を読みやすく表現するための薄い helper。
 */
function reduce(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

/**
 * 初期状態かられんしゅうを開始した状態を作る。
 *
 * 各テストが mode-select の boilerplate を持たず、検証対象の action から読み始められるようにする。
 */
function startPractice(
  problem: Problem = singleProblem(7, 3),
  operation: Operation = "add",
  level: Level = "easy",
): GameState {
  return gameReducer(initialState, {
    type: "START_PRACTICE",
    operation,
    level,
    problem,
  });
}

/**
 * あまりのあるわり算(div×hard)のれんしゅうを開始する。
 *
 * `operation` と `level` が入力桁数に影響するため、2欄入力テストでは必ずこの条件を使う。
 */
function startRemainderPractice(): GameState {
  return startPractice(remainderProblem(), "div", "hard");
}

/**
 * playing 状態の入力だけを取り出す。
 *
 * 期待しない画面へ遷移した場合に、単なる undefined 比較ではなく現在画面を含む失敗にする。
 */
function playingInput(state: GameState) {
  if (state.screen !== "playing") {
    throw new Error(`playing を期待: ${state.screen}`);
  }
  return state.input;
}

describe("れんしゅうの開始 (FR-015)", () => {
  it("モード選択から playing へ遷移し、タイマーの起点を持たない", () => {
    const state = startPractice();
    expect(state.screen).toBe("playing");
    if (state.screen !== "playing") return;
    expect(state.mode).toEqual({ kind: "practice" });
    expect(state.startedAt).toBeNull();
    expect(state.solved).toBe(0);
    expect(state.input).toEqual({ kind: "single", value: "" });
  });

  it("mode-select 以外からは開始できない", () => {
    const playing = startPractice();
    const again = gameReducer(playing, {
      type: "START_PRACTICE",
      operation: "sub",
      level: "easy",
      problem: singleProblem(1, 1),
    });
    expect(again).toBe(playing);
  });
});

describe("答えの入力 (FR-007/010)", () => {
  it("数字を末尾へ追加し、最大桁数を超える入力は無視する", () => {
    // add easy の答えは最大2桁
    let state = startPractice();
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "2" },
      { type: "DIGIT", digit: "3" },
    );
    expect(playingInput(state)).toEqual({ kind: "single", value: "12" });
  });

  it("BACKSPACE は末尾1文字、CLEAR は全部を消す", () => {
    let state = startPractice();
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "0" },
      { type: "BACKSPACE" },
    );
    expect(playingInput(state)).toEqual({ kind: "single", value: "1" });
    state = reduce(state, { type: "DIGIT", digit: "0" }, { type: "CLEAR" });
    expect(playingInput(state)).toEqual({ kind: "single", value: "" });
  });

  it("数字以外の digit は無視する", () => {
    let state = startPractice();
    state = reduce(state, { type: "DIGIT", digit: "a" });
    expect(playingInput(state)).toEqual({ kind: "single", value: "" });
  });
});

describe("正誤判定とフィードバック (FR-011/012/013)", () => {
  it("正解を確定すると correct のフィードバックになる", () => {
    let state = startPractice(singleProblem(7, 3));
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "0" },
      { type: "SUBMIT", now: 1000 },
    );
    expect(state.screen).toBe("feedback");
    if (state.screen !== "feedback") return;
    expect(state.result).toBe("correct");
  });

  it("空の答えでは確定できない", () => {
    const state = startPractice();
    expect(gameReducer(state, { type: "SUBMIT", now: 0 })).toBe(state);
  });

  it("不正解のあとは同じ問題のまま答えだけ空になる (FR-012)", () => {
    const problem = singleProblem(7, 3);
    let state = startPractice(problem);
    state = reduce(
      state,
      { type: "DIGIT", digit: "9" },
      { type: "SUBMIT", now: 1000 },
    );
    expect(state.screen).toBe("feedback");
    state = gameReducer(state, { type: "FEEDBACK_DONE" });
    expect(state.screen).toBe("playing");
    if (state.screen !== "playing") return;
    expect(state.problem).toEqual(problem);
    expect(state.input).toEqual({ kind: "single", value: "" });
    expect(state.solved).toBe(0);
  });

  it("正解のあとは次の問題へ進み、正解数が増える (FR-013)", () => {
    const first = singleProblem(7, 3);
    const next = singleProblem(2, 4);
    let state = startPractice(first);
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "0" },
      { type: "SUBMIT", now: 1000 },
      { type: "FEEDBACK_DONE", problem: next },
    );
    expect(state.screen).toBe("playing");
    if (state.screen !== "playing") return;
    expect(state.problem).toEqual(next);
    expect(state.solved).toBe(1);
    expect(state.lastSolved).toEqual(first);
    expect(state.input).toEqual({ kind: "single", value: "" });
  });

  it("フィードバック中のキー入力は無視される", () => {
    let state = startPractice(singleProblem(7, 3));
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "0" },
      { type: "SUBMIT", now: 1000 },
    );
    const feedback = state;
    expect(gameReducer(feedback, { type: "DIGIT", digit: "5" })).toBe(feedback);
    expect(gameReducer(feedback, { type: "SUBMIT", now: 2000 })).toBe(feedback);
  });
});

describe("あまりのあるわり算の2欄入力 (FR-006)", () => {
  it("最初は「こたえ」欄にフォーカスし、埋まると「あまり」欄へ自動で移る", () => {
    let state = startRemainderPractice();
    expect(playingInput(state)).toEqual({
      kind: "quotient-remainder",
      quotient: "",
      remainder: "",
      focus: "quotient",
    });
    // 商は2桁まで(div hard)。2桁入れると自動であまり欄へ。
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "3" },
    );
    expect(playingInput(state)).toMatchObject({
      quotient: "13",
      focus: "remainder",
    });
    state = reduce(state, { type: "DIGIT", digit: "2" });
    expect(playingInput(state)).toMatchObject({
      quotient: "13",
      remainder: "2",
    });
  });

  it("欄はタップで選び直せる (FOCUS_FIELD)", () => {
    let state = startRemainderPractice();
    state = reduce(state, { type: "FOCUS_FIELD", field: "remainder" });
    state = reduce(state, { type: "DIGIT", digit: "2" });
    expect(playingInput(state)).toMatchObject({
      quotient: "",
      remainder: "2",
      focus: "remainder",
    });
  });

  it("あまり欄が空のときの BACKSPACE は商欄へ戻って1文字消す", () => {
    let state = startRemainderPractice();
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "3" },
      { type: "BACKSPACE" },
    );
    expect(playingInput(state)).toMatchObject({
      quotient: "1",
      focus: "quotient",
    });
  });

  it("両欄がそろうまでは確定できない（片方だけでは判定しない）", () => {
    let state = startRemainderPractice();
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "3" },
    );
    // quotient=13, remainder は空
    expect(gameReducer(state, { type: "SUBMIT", now: 0 })).toBe(state);
  });

  it("商とあまりの両方が一致したときだけ正解になる", () => {
    const base = startRemainderPractice();
    const filled = reduce(
      base,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "3" },
      { type: "DIGIT", digit: "2" },
    );
    const correct = gameReducer(filled, { type: "SUBMIT", now: 0 });
    expect(correct.screen).toBe("feedback");
    if (correct.screen === "feedback") {
      expect(correct.result).toBe("correct");
    }

    const wrongRemainder = reduce(
      base,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "3" },
      { type: "DIGIT", digit: "5" },
      { type: "SUBMIT", now: 0 },
    );
    expect(wrongRemainder.screen).toBe("feedback");
    if (wrongRemainder.screen === "feedback") {
      expect(wrongRemainder.result).toBe("wrong");
    }
  });
});

describe("れんしゅうの終了 (FR-016)", () => {
  it("おわるで成果表示へ移り、正解数を引き継ぐ", () => {
    let state = startPractice(singleProblem(7, 3));
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "0" },
      { type: "SUBMIT", now: 0 },
      { type: "FEEDBACK_DONE", problem: singleProblem(2, 2) },
      { type: "END_PRACTICE" },
    );
    expect(state).toMatchObject({ screen: "practice-summary", solved: 1 });
  });

  it("1問も解かずに終了しても破綻しない", () => {
    const state = reduce(startPractice(), { type: "END_PRACTICE" });
    expect(state).toMatchObject({ screen: "practice-summary", solved: 0 });
  });

  it("正解表示中に終了した場合はその1問も成果に数える", () => {
    let state = startPractice(singleProblem(7, 3));
    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "0" },
      { type: "SUBMIT", now: 0 },
      { type: "END_PRACTICE" },
    );
    expect(state).toMatchObject({ screen: "practice-summary", solved: 1 });
  });

  it("ホームへ戻ると初期状態になる (FR-033)", () => {
    const state = reduce(startPractice(), { type: "BACK_TO_MODE_SELECT" });
    expect(state).toEqual(initialState);
  });
});

describe("タイムアタック (FR-018/019/020/024)", () => {
  /**
   * 初期状態から10問タイムアタックのカウントダウン画面を作る。
   *
   * カウントダウン遷移とプレイ開始後の計測を別々に検証できるようにする。
   */
  function startCountdown(): GameState {
    return gameReducer(initialState, {
      type: "START_TIME_ATTACK",
      operation: "add",
      level: "easy",
      target: 10,
    });
  }

  /**
   * カウントダウンを完了し、タイムアタックの playing 状態を作る。
   *
   * 開始時刻を 3000ms に固定し、elapsedMs の期待値を読みやすくする。
   */
  function startTimeAttack(problem: Problem = singleProblem(7, 3)): GameState {
    return reduce(
      startCountdown(),
      { type: "COUNTDOWN_TICK", now: 1000, problem: singleProblem(1, 1) },
      { type: "COUNTDOWN_TICK", now: 2000, problem: singleProblem(1, 1) },
      { type: "COUNTDOWN_TICK", now: 3000, problem },
    );
  }

  it("3カウント後に timeAttack の playing へ入り、開始時刻を持つ", () => {
    let state = startCountdown();
    expect(state).toMatchObject({ screen: "countdown", remaining: 3 });
    state = gameReducer(state, {
      type: "COUNTDOWN_TICK",
      now: 1000,
      problem: singleProblem(1, 1),
    });
    expect(state).toMatchObject({ screen: "countdown", remaining: 2 });
    state = gameReducer(state, {
      type: "COUNTDOWN_TICK",
      now: 2000,
      problem: singleProblem(1, 1),
    });
    expect(state).toMatchObject({ screen: "countdown", remaining: 1 });
    state = gameReducer(state, {
      type: "COUNTDOWN_TICK",
      now: 3000,
      problem: singleProblem(4, 5),
    });
    expect(state).toMatchObject({
      screen: "playing",
      mode: { kind: "timeAttack", target: 10 },
      startedAt: 3000,
      solved: 0,
    });
  });

  it("正解だけが進捗に加算され、最終正解で elapsedMs が確定する", () => {
    let state = startTimeAttack(singleProblem(7, 3));
    state = reduce(
      state,
      { type: "DIGIT", digit: "9" },
      { type: "SUBMIT", now: 3100 },
      { type: "FEEDBACK_DONE" },
    );
    expect(state).toMatchObject({ screen: "playing", solved: 0 });

    for (let solved = 0; solved < 9; solved++) {
      state = reduce(
        state,
        { type: "DIGIT", digit: "1" },
        { type: "DIGIT", digit: "0" },
        { type: "SUBMIT", now: 4000 + solved },
        { type: "FEEDBACK_DONE", problem: singleProblem(7, 3) },
      );
      expect(state).toMatchObject({ screen: "playing", solved: solved + 1 });
    }

    state = reduce(
      state,
      { type: "DIGIT", digit: "1" },
      { type: "DIGIT", digit: "0" },
      { type: "SUBMIT", now: 6000 },
      { type: "FEEDBACK_DONE" },
    );
    expect(state).toEqual({
      screen: "result",
      operation: "add",
      level: "easy",
      target: 10,
      elapsedMs: 3000,
    });
  });

  it("result から同条件で再挑戦できる", () => {
    const state = gameReducer(
      {
        screen: "result",
        operation: "sub",
        level: "hard",
        target: 30,
        elapsedMs: 12345,
      },
      { type: "RETRY" },
    );
    expect(state).toEqual({
      screen: "countdown",
      operation: "sub",
      level: "hard",
      target: 30,
      remaining: 3,
    });
  });
});
