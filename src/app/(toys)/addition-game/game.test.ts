import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES,
  type GameState,
  gameReducer,
  generateProblem,
  initialState,
} from "./game";

/** 固定の値列を順に返す rng。値は [0, 1) で指定する。 */
function sequenceRng(values: number[]) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

describe("generateProblem", () => {
  it("きほんは 0〜9 の整数2個で、答えは a + b になる (FR-002)", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generateProblem("basic");
      expect(Number.isInteger(problem.a)).toBe(true);
      expect(Number.isInteger(problem.b)).toBe(true);
      expect(problem.a).toBeGreaterThanOrEqual(0);
      expect(problem.a).toBeLessThanOrEqual(9);
      expect(problem.b).toBeGreaterThanOrEqual(0);
      expect(problem.b).toBeLessThanOrEqual(9);
      expect(problem.answer).toBe(problem.a + problem.b);
    }
  });

  it("じょうきゅうは 10〜99 の整数2個で、答えは a + b になる (FR-002)", () => {
    for (let i = 0; i < 200; i++) {
      const problem = generateProblem("advanced");
      expect(problem.a).toBeGreaterThanOrEqual(10);
      expect(problem.a).toBeLessThanOrEqual(99);
      expect(problem.b).toBeGreaterThanOrEqual(10);
      expect(problem.b).toBeLessThanOrEqual(99);
      expect(problem.answer).toBe(problem.a + problem.b);
    }
  });

  it("rng の下限・上限で境界値の問題を生成できる (0+0・9+9・10+10・99+99)", () => {
    expect(generateProblem("basic", null, sequenceRng([0, 0]))).toEqual({
      a: 0,
      b: 0,
      answer: 0,
    });
    expect(generateProblem("basic", null, sequenceRng([0.999, 0.999]))).toEqual(
      { a: 9, b: 9, answer: 18 },
    );
    expect(generateProblem("advanced", null, sequenceRng([0, 0]))).toEqual({
      a: 10,
      b: 10,
      answer: 20,
    });
    expect(
      generateProblem("advanced", null, sequenceRng([0.999, 0.999])),
    ).toEqual({ a: 99, b: 99, answer: 198 });
  });

  it("直前に正解した問題と同じ2数・同じ順の式は再抽選で除外する (FR-020)", () => {
    // rng は (3,4) → (3,4) → (5,6) の順に生成させる。exclude と一致する間は読み捨てる。
    const rng = sequenceRng([0.3, 0.4, 0.3, 0.4, 0.5, 0.6]);
    const problem = generateProblem("basic", { a: 3, b: 4, answer: 7 }, rng);
    expect(problem).toEqual({ a: 5, b: 6, answer: 11 });
  });

  it("順序が違う同じ2数 (4+3 の直後の 3+4) は許可する (FR-020)", () => {
    const rng = sequenceRng([0.3, 0.4]);
    const problem = generateProblem("basic", { a: 4, b: 3, answer: 7 }, rng);
    expect(problem).toEqual({ a: 3, b: 4, answer: 7 });
  });

  it("難易度定義: 答えの最大桁数はきほん2桁・じょうきゅう3桁 (FR-022)", () => {
    expect(DIFFICULTIES.basic.maxAnswerDigits).toBe(2);
    expect(DIFFICULTIES.advanced.maxAnswerDigits).toBe(3);
  });
});

type PlayingState = Extract<GameState, { screen: "playing" }>;
type FeedbackState = Extract<GameState, { screen: "feedback" }>;

function playingState(overrides: Partial<PlayingState> = {}): PlayingState {
  return {
    screen: "playing",
    difficulty: "basic",
    mode: { kind: "free" },
    problem: { a: 3, b: 4, answer: 7 },
    answer: "",
    solved: 0,
    lastSolved: null,
    startedAt: null,
    ...overrides,
  };
}

function feedbackState(overrides: Partial<FeedbackState> = {}): FeedbackState {
  return {
    ...playingState(),
    screen: "feedback",
    result: "correct",
    finishedAt: null,
    ...overrides,
  };
}

describe("フリーモードの遷移 (US1)", () => {
  it("START_FREE でタイマーなしの playing に入る (FR-011)", () => {
    const problem = { a: 2, b: 5, answer: 7 };
    const state = gameReducer(initialState, {
      type: "START_FREE",
      difficulty: "basic",
      problem,
    });
    expect(state).toEqual(playingState({ problem }) satisfies PlayingState);
  });

  it("DIGIT は答えの末尾に追加される (FR-004)", () => {
    let state: GameState = playingState();
    state = gameReducer(state, { type: "DIGIT", digit: "1" });
    state = gameReducer(state, { type: "DIGIT", digit: "2" });
    expect(state).toMatchObject({ answer: "12" });
  });

  it("きほんは3文字目の DIGIT を受け付けない (FR-022)", () => {
    const state = playingState({ answer: "18" });
    expect(gameReducer(state, { type: "DIGIT", digit: "9" })).toBe(state);
  });

  it("数字以外の DIGIT は無視する", () => {
    const state = playingState();
    expect(gameReducer(state, { type: "DIGIT", digit: "x" })).toBe(state);
  });

  it("BACKSPACE は末尾1文字だけ削除する (FR-021)", () => {
    const state = gameReducer(playingState({ answer: "12" }), {
      type: "BACKSPACE",
    });
    expect(state).toMatchObject({ answer: "1", problem: { a: 3, b: 4 } });
  });

  it("答えが空のときの BACKSPACE は何もしない (FR-021)", () => {
    const state = playingState({ answer: "" });
    expect(gameReducer(state, { type: "BACKSPACE" })).toBe(state);
  });

  it("CLEAR は答えだけを空にし、問題と進行状態を保つ (FR-006)", () => {
    const state = gameReducer(playingState({ answer: "12", solved: 3 }), {
      type: "CLEAR",
    });
    expect(state).toMatchObject({
      answer: "",
      solved: 3,
      problem: { a: 3, b: 4 },
    });
  });

  it("答えが空のときの SUBMIT は判定しない (FR-007)", () => {
    const state = playingState({ answer: "" });
    expect(gameReducer(state, { type: "SUBMIT", now: 1000 })).toBe(state);
  });

  it("正解の SUBMIT は feedback(correct) へ進む (FR-008)", () => {
    const state = gameReducer(playingState({ answer: "7" }), {
      type: "SUBMIT",
      now: 1000,
    });
    expect(state).toMatchObject({
      screen: "feedback",
      result: "correct",
      finishedAt: null,
    });
  });

  it("誤答の SUBMIT は feedback(wrong) へ進む (FR-009)", () => {
    const state = gameReducer(playingState({ answer: "9" }), {
      type: "SUBMIT",
      now: 1000,
    });
    expect(state).toMatchObject({ screen: "feedback", result: "wrong" });
  });

  it("feedback 中の SUBMIT・DIGIT・BACKSPACE・CLEAR は無効 (FR-010)", () => {
    const state = feedbackState();
    expect(gameReducer(state, { type: "SUBMIT", now: 2000 })).toBe(state);
    expect(gameReducer(state, { type: "DIGIT", digit: "1" })).toBe(state);
    expect(gameReducer(state, { type: "BACKSPACE" })).toBe(state);
    expect(gameReducer(state, { type: "CLEAR" })).toBe(state);
  });

  it("正解の FEEDBACK_DONE は次の問題へ進み、lastSolved を更新する (FR-008/020)", () => {
    const solvedProblem = { a: 3, b: 4, answer: 7 };
    const nextProblem = { a: 5, b: 6, answer: 11 };
    const state = gameReducer(
      feedbackState({ problem: solvedProblem, answer: "7" }),
      { type: "FEEDBACK_DONE", problem: nextProblem },
    );
    expect(state).toMatchObject({
      screen: "playing",
      problem: nextProblem,
      answer: "",
      solved: 1,
      lastSolved: solvedProblem,
    });
  });

  it("誤答の FEEDBACK_DONE は同じ問題に答えを空にして戻る (FR-009)", () => {
    const state = gameReducer(
      feedbackState({ result: "wrong", answer: "9", solved: 2 }),
      { type: "FEEDBACK_DONE" },
    );
    expect(state).toMatchObject({
      screen: "playing",
      problem: { a: 3, b: 4 },
      answer: "",
      solved: 2,
      lastSolved: null,
    });
  });

  it("フリーモードは何問正解しても終了しない (FR-011)", () => {
    const submitted = gameReducer(playingState({ answer: "7", solved: 999 }), {
      type: "SUBMIT",
      now: 5000,
    });
    expect(submitted).toMatchObject({ screen: "feedback", result: "correct" });
    const state = gameReducer(submitted, {
      type: "FEEDBACK_DONE",
      problem: { a: 1, b: 2, answer: 3 },
    });
    expect(state).toMatchObject({ screen: "playing", solved: 1000 });
  });

  it("モード選択中のキー入力アクションは無効", () => {
    expect(gameReducer(initialState, { type: "DIGIT", digit: "1" })).toBe(
      initialState,
    );
    expect(gameReducer(initialState, { type: "SUBMIT", now: 0 })).toBe(
      initialState,
    );
  });

  it("BACK_TO_MODE_SELECT はどの playing/feedback からもモード選択へ戻る (FR-017)", () => {
    expect(
      gameReducer(playingState({ answer: "1" }), {
        type: "BACK_TO_MODE_SELECT",
      }),
    ).toEqual(initialState);
    expect(
      gameReducer(feedbackState(), { type: "BACK_TO_MODE_SELECT" }),
    ).toEqual(initialState);
  });
});

describe("タイムアタックの遷移 (US2)", () => {
  const problem = { a: 3, b: 4, answer: 7 };

  function timeAttackPlaying(overrides: Partial<PlayingState> = {}) {
    return playingState({
      mode: { kind: "timeAttack", target: 10 },
      startedAt: 1_000,
      ...overrides,
    });
  }

  it("START_TIME_ATTACK でカウントダウン(3)に入る (FR-012)", () => {
    const state = gameReducer(initialState, {
      type: "START_TIME_ATTACK",
      difficulty: "basic",
      target: 10,
    });
    expect(state).toEqual({
      screen: "countdown",
      difficulty: "basic",
      target: 10,
      remaining: 3,
    });
  });

  it("COUNTDOWN_TICK が 3→2→1 と進み、終了時に playing とタイマーを開始する (FR-012/013)", () => {
    let state: GameState = {
      screen: "countdown",
      difficulty: "basic",
      target: 10,
      remaining: 3,
    };
    state = gameReducer(state, { type: "COUNTDOWN_TICK", now: 1_000, problem });
    expect(state).toMatchObject({ screen: "countdown", remaining: 2 });
    state = gameReducer(state, { type: "COUNTDOWN_TICK", now: 2_000, problem });
    expect(state).toMatchObject({ screen: "countdown", remaining: 1 });
    state = gameReducer(state, { type: "COUNTDOWN_TICK", now: 3_000, problem });
    expect(state).toMatchObject({
      screen: "playing",
      mode: { kind: "timeAttack", target: 10 },
      problem,
      answer: "",
      solved: 0,
      startedAt: 3_000,
    });
  });

  it("カウントダウン中のキー入力アクションは無効 (FR-012)", () => {
    const state: GameState = {
      screen: "countdown",
      difficulty: "basic",
      target: 10,
      remaining: 2,
    };
    expect(gameReducer(state, { type: "DIGIT", digit: "5" })).toBe(state);
    expect(gameReducer(state, { type: "SUBMIT", now: 0 })).toBe(state);
    expect(gameReducer(state, { type: "CLEAR" })).toBe(state);
    expect(gameReducer(state, { type: "BACKSPACE" })).toBe(state);
  });

  it("正解で solved が増え、誤答では増えない (FR-015)", () => {
    const correct = gameReducer(
      gameReducer(timeAttackPlaying({ answer: "7", solved: 3 }), {
        type: "SUBMIT",
        now: 5_000,
      }),
      { type: "FEEDBACK_DONE", problem: { a: 1, b: 2, answer: 3 } },
    );
    expect(correct).toMatchObject({ screen: "playing", solved: 4 });

    const wrong = gameReducer(
      gameReducer(timeAttackPlaying({ answer: "9", solved: 3 }), {
        type: "SUBMIT",
        now: 5_000,
      }),
      { type: "FEEDBACK_DONE" },
    );
    expect(wrong).toMatchObject({
      screen: "playing",
      solved: 3,
      problem: { a: 3, b: 4 },
    });
  });

  it("誤答してもタイマー起点 startedAt は変わらない (FR-015)", () => {
    const state = gameReducer(timeAttackPlaying({ answer: "9" }), {
      type: "SUBMIT",
      now: 9_000,
    });
    expect(state).toMatchObject({
      screen: "feedback",
      result: "wrong",
      startedAt: 1_000,
      finishedAt: null,
    });
  });

  it("最終問題の正解で finishedAt が確定する (FR-013)", () => {
    const state = gameReducer(timeAttackPlaying({ answer: "7", solved: 9 }), {
      type: "SUBMIT",
      now: 61_000,
    });
    expect(state).toMatchObject({
      screen: "feedback",
      result: "correct",
      finishedAt: 61_000,
    });
  });

  it("完了後の FEEDBACK_DONE は結果画面へ進み、所要時間を確定する (FR-016)", () => {
    const submitted = gameReducer(
      timeAttackPlaying({ answer: "7", solved: 9 }),
      { type: "SUBMIT", now: 61_000 },
    );
    const state = gameReducer(submitted, { type: "FEEDBACK_DONE" });
    expect(state).toEqual({
      screen: "result",
      difficulty: "basic",
      target: 10,
      elapsedMs: 60_000,
    });
  });

  it("RETRY は同じ難易度・同じ問題数でカウントダウンから再開する (FR-016/024)", () => {
    const result: GameState = {
      screen: "result",
      difficulty: "basic",
      target: 30,
      elapsedMs: 123_400,
    };
    expect(gameReducer(result, { type: "RETRY" })).toEqual({
      screen: "countdown",
      difficulty: "basic",
      target: 30,
      remaining: 3,
    });
  });

  it("カウントダウン・結果からも BACK_TO_MODE_SELECT で戻れる (FR-017)", () => {
    const countdown: GameState = {
      screen: "countdown",
      difficulty: "basic",
      target: 10,
      remaining: 3,
    };
    const result: GameState = {
      screen: "result",
      difficulty: "basic",
      target: 10,
      elapsedMs: 1_000,
    };
    expect(gameReducer(countdown, { type: "BACK_TO_MODE_SELECT" })).toEqual(
      initialState,
    );
    expect(gameReducer(result, { type: "BACK_TO_MODE_SELECT" })).toEqual(
      initialState,
    );
  });
});

describe("じょうきゅう難易度 (US3)", () => {
  it("advanced の START_FREE は難易度を保持し、2桁同士の問題を受け取る (FR-002)", () => {
    const problem = generateProblem("advanced", null, sequenceRng([0.5, 0.5]));
    const state = gameReducer(initialState, {
      type: "START_FREE",
      difficulty: "advanced",
      problem,
    });
    expect(state).toMatchObject({
      screen: "playing",
      difficulty: "advanced",
      problem: { a: 55, b: 55, answer: 110 },
    });
  });

  it("advanced は3桁まで入力でき、4桁目の DIGIT は無視する (FR-022)", () => {
    let state: GameState = playingState({
      difficulty: "advanced",
      problem: { a: 99, b: 99, answer: 198 },
    });
    for (const digit of "1988") {
      state = gameReducer(state, { type: "DIGIT", digit });
    }
    expect(state).toMatchObject({ answer: "198" });
  });

  it("advanced の START_TIME_ATTACK は難易度をカウントダウンと playing に引き継ぐ", () => {
    const problem = { a: 12, b: 34, answer: 46 };
    let state = gameReducer(initialState, {
      type: "START_TIME_ATTACK",
      difficulty: "advanced",
      target: 10,
    });
    expect(state).toMatchObject({
      screen: "countdown",
      difficulty: "advanced",
    });
    for (let i = 0; i < 3; i++) {
      state = gameReducer(state, {
        type: "COUNTDOWN_TICK",
        now: 1_000 * (i + 1),
        problem,
      });
    }
    expect(state).toMatchObject({
      screen: "playing",
      difficulty: "advanced",
      problem,
    });
  });

  it("RETRY は難易度 advanced を引き継ぐ (FR-024)", () => {
    const result: GameState = {
      screen: "result",
      difficulty: "advanced",
      target: 50,
      elapsedMs: 90_000,
    };
    expect(gameReducer(result, { type: "RETRY" })).toEqual({
      screen: "countdown",
      difficulty: "advanced",
      target: 50,
      remaining: 3,
    });
  });
});
