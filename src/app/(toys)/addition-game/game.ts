// ゲーム規則(状態機械・問題生成)。React・DOM・タイマーに依存しない。
// 乱数と現在時刻は引数・アクションで注入する。reducer を純関数に保ち
// (React 19 の要件)、テストを決定的にするための境界。

export type Difficulty = "basic" | "advanced";

export type DifficultyConfig = {
  label: string;
  /** オペランドの最小値・最大値(両端を含む) */
  min: number;
  max: number;
  /** 答えとして入力できる最大桁数 (FR-022) */
  maxAnswerDigits: number;
};

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  basic: { label: "きほん", min: 0, max: 9, maxAnswerDigits: 2 },
  advanced: { label: "じょうきゅう", min: 10, max: 99, maxAnswerDigits: 3 },
};

export const TIME_ATTACK_TARGETS = [10, 30, 50, 100] as const;
export type TimeAttackTarget = (typeof TIME_ATTACK_TARGETS)[number];

// FR-008/009: 正誤表示は 0.5〜1.5 秒。テンポと読み取りやすさの折衷で中央付近を採用。
export const FEEDBACK_MS = 800;
// FR-012: カウントダウンは 3・2・1 を各1秒。
export const COUNTDOWN_STEP_MS = 1000;
// FR-014: 経過時間は 0.1 秒単位で表示する(計測はタイムスタンプ差分で行い、この間隔に依存しない)。
export const TIMER_DISPLAY_INTERVAL_MS = 100;

export type Problem = { a: number; b: number; answer: number };

export type GameMode =
  | { kind: "free" }
  | { kind: "timeAttack"; target: TimeAttackTarget };

type SessionBase = {
  difficulty: Difficulty;
  mode: GameMode;
  problem: Problem;
  /** 入力中の答え。数字のみの文字列 */
  answer: string;
  /** 正解済み問題数 (FR-015: 正解した問題だけを数える) */
  solved: number;
  /** 直前に正解した問題。FR-020 の連続重複禁止の除外対象 */
  lastSolved: Problem | null;
  /** タイムアタックのみ非 null。カウントダウン終了時刻 (FR-013) */
  startedAt: number | null;
};

export type GameState =
  | { screen: "mode-select" }
  | {
      screen: "countdown";
      difficulty: Difficulty;
      target: TimeAttackTarget;
      remaining: 1 | 2 | 3;
    }
  | ({ screen: "playing" } & SessionBase)
  | ({
      screen: "feedback";
      result: "correct" | "wrong";
      /** 最終問題の正解時刻。所要時間はこの瞬間で確定する (FR-013) */
      finishedAt: number | null;
    } & SessionBase)
  | {
      screen: "result";
      difficulty: Difficulty;
      target: TimeAttackTarget;
      elapsedMs: number;
    };

export type GameAction =
  | { type: "START_FREE"; difficulty: Difficulty; problem: Problem }
  | {
      type: "START_TIME_ATTACK";
      difficulty: Difficulty;
      target: TimeAttackTarget;
    }
  | { type: "COUNTDOWN_TICK"; now: number; problem: Problem }
  | { type: "DIGIT"; digit: string }
  | { type: "BACKSPACE" }
  | { type: "CLEAR" }
  | { type: "SUBMIT"; now: number }
  | { type: "FEEDBACK_DONE"; problem?: Problem }
  | { type: "RETRY" }
  | { type: "BACK_TO_MODE_SELECT" };

export const initialState: GameState = { screen: "mode-select" };

export function generateProblem(
  difficulty: Difficulty,
  exclude: Problem | null = null,
  rng: () => number = Math.random,
): Problem {
  const { min, max } = DIFFICULTIES[difficulty];
  const span = max - min + 1;
  // FR-020: 直前に正解した式と同じ2数・同じ順は出さない。除外対象は高々1組
  // (組み合わせ空間はきほん100通り・じょうきゅう8100通り)なので再抽選で十分。
  while (true) {
    const a = min + Math.floor(rng() * span);
    const b = min + Math.floor(rng() * span);
    if (exclude && exclude.a === a && exclude.b === b) {
      continue;
    }
    return { a, b, answer: a + b };
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "BACK_TO_MODE_SELECT":
      return initialState;

    case "START_FREE":
      if (state.screen !== "mode-select") {
        return state;
      }
      return {
        screen: "playing",
        difficulty: action.difficulty,
        mode: { kind: "free" },
        problem: action.problem,
        answer: "",
        solved: 0,
        lastSolved: null,
        startedAt: null,
      };

    case "START_TIME_ATTACK":
      if (state.screen !== "mode-select") {
        return state;
      }
      return {
        screen: "countdown",
        difficulty: action.difficulty,
        target: action.target,
        remaining: 3,
      };

    case "COUNTDOWN_TICK":
      if (state.screen !== "countdown") {
        return state;
      }
      if (state.remaining > 1) {
        return { ...state, remaining: (state.remaining - 1) as 1 | 2 };
      }
      // カウントダウン終了の瞬間からタイマーを開始する (FR-013)。
      return {
        screen: "playing",
        difficulty: state.difficulty,
        mode: { kind: "timeAttack", target: state.target },
        problem: action.problem,
        answer: "",
        solved: 0,
        lastSolved: null,
        startedAt: action.now,
      };

    case "RETRY":
      if (state.screen !== "result") {
        return state;
      }
      // 同じ難易度・同じ問題数で再挑戦する (FR-024)。
      return {
        screen: "countdown",
        difficulty: state.difficulty,
        target: state.target,
        remaining: 3,
      };

    case "DIGIT": {
      if (state.screen !== "playing" || !/^[0-9]$/.test(action.digit)) {
        return state;
      }
      const maxDigits = DIFFICULTIES[state.difficulty].maxAnswerDigits;
      if (state.answer.length >= maxDigits) {
        return state;
      }
      return { ...state, answer: state.answer + action.digit };
    }

    case "BACKSPACE":
      if (state.screen !== "playing" || state.answer === "") {
        return state;
      }
      return { ...state, answer: state.answer.slice(0, -1) };

    case "CLEAR":
      if (state.screen !== "playing") {
        return state;
      }
      return { ...state, answer: "" };

    case "SUBMIT": {
      if (state.screen !== "playing" || state.answer === "") {
        return state;
      }
      const correct = Number(state.answer) === state.problem.answer;
      const finishesTimeAttack =
        correct &&
        state.mode.kind === "timeAttack" &&
        state.solved + 1 >= state.mode.target;
      return {
        ...state,
        screen: "feedback",
        result: correct ? "correct" : "wrong",
        // 所要時間は最終問題に正解した瞬間で確定する。正誤表示の時間は含めない (FR-013)。
        finishedAt: finishesTimeAttack ? action.now : null,
      };
    }

    case "FEEDBACK_DONE": {
      if (state.screen !== "feedback") {
        return state;
      }
      const { result, finishedAt, ...session } = state;
      if (result === "wrong") {
        // 同じ問題に再挑戦できるよう答えだけ空にする (FR-009)。
        return { ...session, screen: "playing", answer: "" };
      }
      if (
        session.mode.kind === "timeAttack" &&
        session.solved + 1 >= session.mode.target &&
        finishedAt !== null &&
        session.startedAt !== null
      ) {
        return {
          screen: "result",
          difficulty: session.difficulty,
          target: session.mode.target,
          elapsedMs: finishedAt - session.startedAt,
        };
      }
      if (!action.problem) {
        return state;
      }
      return {
        ...session,
        screen: "playing",
        problem: action.problem,
        answer: "",
        solved: session.solved + 1,
        lastSolved: session.problem,
      };
    }

    default:
      // 対応しない (state, action) の組は状態を変えない。
      // カウントダウン・正誤表示・モード選択中のキー入力の無効化もこの規則に含まれる。
      return state;
  }
}
