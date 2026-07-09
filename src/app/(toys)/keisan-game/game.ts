import {
  type Level,
  maxAnswerDigits,
  type Operation,
  type Problem,
  REMAINDER_MAX_DIGITS,
} from "./operations";

/**
 * タイムアタックで選べる目標問題数。
 *
 * UI のボタン、型、記録キーを同じ配列から派生させ、選択肢の不一致を防ぐ。
 */
export const TIME_ATTACK_TARGETS = [10, 30, 50] as const;

/**
 * タイムアタックの目標問題数。
 *
 * `TIME_ATTACK_TARGETS` から派生させ、追加時に型定義を別途編集しなくてよいようにする。
 */
export type TimeAttackTarget = (typeof TIME_ATTACK_TARGETS)[number];

/**
 * 正誤フィードバックを表示する時間。
 *
 * 子どもが結果を読み取れる長さを確保しつつ、次の問題へ自動で進めるための値。
 */
export const FEEDBACK_MS = 800;

/**
 * カウントダウンの1ステップの長さ。
 *
 * 3・2・1 を各1秒で見せ、開始タイミングを予測しやすくする。
 */
export const COUNTDOWN_STEP_MS = 1000;

/**
 * 経過時間表示を更新する間隔。
 *
 * 計測自体はタイムスタンプ差分で行い、この値は見た目の更新頻度だけを決める。
 */
export const TIMER_DISPLAY_INTERVAL_MS = 100;

/**
 * 現在のプレイモード。
 *
 * れんしゅうは終了操作まで続き、タイムアタックだけ目標問題数を持つため union で分ける。
 */
export type GameMode =
  | { kind: "practice" }
  | { kind: "timeAttack"; target: TimeAttackTarget };

/**
 * 入力中の答え。あまりのあるわり算だけ「こたえ」(商)と「あまり」の2欄を持ち、
 * テンキー入力は focus の欄へ反映する (FR-006)。
 */
export type AnswerInput =
  | { kind: "single"; value: string }
  | {
      kind: "quotient-remainder";
      quotient: string;
      remainder: string;
      focus: "quotient" | "remainder";
    };

/**
 * 問題の答え形式に合う空入力を作る。
 *
 * 問題切り替え・不正解後の再挑戦・クリア操作で同じ初期化を使い、2欄入力の分岐漏れを防ぐ。
 */
export function emptyInputFor(problem: Problem): AnswerInput {
  return problem.answer.kind === "single"
    ? { kind: "single", value: "" }
    : {
        kind: "quotient-remainder",
        quotient: "",
        remainder: "",
        focus: "quotient",
      };
}

/**
 * プレイ中とフィードバック中で共有するセッション情報。
 *
 * 画面だけが変わっても問題・入力・計測情報は引き継ぐため、共通部分を型でまとめる。
 */
type SessionBase = {
  operation: Operation;
  level: Level;
  mode: GameMode;
  problem: Problem;
  input: AnswerInput;
  /** 正解済み問題数 (FR-019: 正解した問題だけを数える) */
  solved: number;
  /** 直前に正解した問題。FR-005 の連続重複禁止の除外対象 */
  lastSolved: Problem | null;
  /** タイムアタックのみ非 null。カウントダウン終了時刻 (FR-018) */
  startedAt: number | null;
  /** タイムアタックで正誤表示中に止める累計時間 (FR-020) */
  pausedMs: number;
};

/**
 * 計算ゲームの画面状態。
 *
 * React コンポーネントが画面ごとの必要データだけ参照できるよう、screen を判別子にした
 * union として表す。
 */
export type GameState =
  | { screen: "mode-select" }
  | {
      screen: "countdown";
      operation: Operation;
      level: Level;
      target: TimeAttackTarget;
      remaining: 1 | 2 | 3;
    }
  | ({ screen: "playing" } & SessionBase)
  | ({
      screen: "feedback";
      result: "correct" | "wrong";
      /** 正誤表示に入った時刻。タイムアタックではこの間を計測から除外する */
      feedbackStartedAt: number;
      /** 最終問題の正解時刻。所要時間はこの瞬間で確定する (FR-020) */
      finishedAt: number | null;
    } & SessionBase)
  | {
      screen: "practice-summary";
      operation: Operation;
      level: Level;
      solved: number;
    }
  | {
      screen: "result";
      operation: Operation;
      level: Level;
      target: TimeAttackTarget;
      elapsedMs: number;
    };

/**
 * reducer が受け取るゲーム内イベント。
 *
 * 乱数で作った次問題と現在時刻は action 側から注入し、reducer を React・DOM・タイマーに
 * 依存しない純関数として保つ。
 */
export type GameAction =
  | {
      type: "START_PRACTICE";
      operation: Operation;
      level: Level;
      problem: Problem;
    }
  | {
      type: "START_TIME_ATTACK";
      operation: Operation;
      level: Level;
      target: TimeAttackTarget;
    }
  | { type: "COUNTDOWN_TICK"; now: number; problem: Problem }
  | { type: "DIGIT"; digit: string }
  | { type: "BACKSPACE" }
  | { type: "CLEAR" }
  | { type: "FOCUS_FIELD"; field: "quotient" | "remainder" }
  | { type: "SUBMIT"; now: number }
  | { type: "FEEDBACK_DONE"; now?: number; problem?: Problem }
  | { type: "END_PRACTICE" }
  | { type: "RETRY" }
  | { type: "BACK_TO_MODE_SELECT" };

/**
 * ゲームの初期状態。
 *
 * どの画面からホームへ戻ってもこの値へ戻すことで、選択中の演算や入力を残さない。
 */
export const initialState: GameState = { screen: "mode-select" };

/**
 * 確定できるだけの入力がそろっているかを判定する。
 *
 * あまりのあるわり算では片方だけの入力で採点しないため、採点前のガードをここに集約する。
 */
function isInputComplete(input: AnswerInput): boolean {
  return input.kind === "single"
    ? input.value !== ""
    : input.quotient !== "" && input.remainder !== "";
}

/**
 * 現在の入力が問題の答えと一致するかを判定する。
 *
 * 入力は文字列、答えは数値で保持しているため、UI の入力形式を reducer 内だけで数値化する。
 */
function isInputCorrect(problem: Problem, input: AnswerInput): boolean {
  if (problem.answer.kind === "single") {
    return (
      input.kind === "single" && Number(input.value) === problem.answer.value
    );
  }
  return (
    input.kind === "quotient-remainder" &&
    Number(input.quotient) === problem.answer.quotient &&
    Number(input.remainder) === problem.answer.remainder
  );
}

/**
 * ゲーム状態を進める純粋な reducer。
 *
 * UI イベント、タイマー、問題生成を action に変換してから渡す設計にしている。これにより
 * れんしゅう・タイムアタック・フィードバックの遷移をユニットテストで決定的に検証できる。
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "BACK_TO_MODE_SELECT":
      return initialState;

    case "START_PRACTICE":
      if (state.screen !== "mode-select") {
        return state;
      }
      return {
        screen: "playing",
        operation: action.operation,
        level: action.level,
        mode: { kind: "practice" },
        problem: action.problem,
        input: emptyInputFor(action.problem),
        solved: 0,
        lastSolved: null,
        startedAt: null,
        pausedMs: 0,
      };

    case "START_TIME_ATTACK":
      if (state.screen !== "mode-select") {
        return state;
      }
      return {
        screen: "countdown",
        operation: action.operation,
        level: action.level,
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
      // カウントダウン終了の瞬間からタイマーを開始する (FR-018)。
      return {
        screen: "playing",
        operation: state.operation,
        level: state.level,
        mode: { kind: "timeAttack", target: state.target },
        problem: action.problem,
        input: emptyInputFor(action.problem),
        solved: 0,
        lastSolved: null,
        startedAt: action.now,
        pausedMs: 0,
      };

    case "RETRY":
      if (state.screen !== "result") {
        return state;
      }
      // 同じ演算・レベル・問題数で再挑戦する (FR-024)。
      return {
        screen: "countdown",
        operation: state.operation,
        level: state.level,
        target: state.target,
        remaining: 3,
      };

    case "DIGIT": {
      if (state.screen !== "playing" || !/^[0-9]$/.test(action.digit)) {
        return state;
      }
      const input = state.input;
      if (input.kind === "single") {
        if (
          input.value.length >= maxAnswerDigits(state.problem.op, state.level)
        ) {
          return state;
        }
        return {
          ...state,
          input: { ...input, value: input.value + action.digit },
        };
      }
      const quotientLimit = maxAnswerDigits(state.problem.op, state.level);
      if (input.focus === "quotient") {
        if (input.quotient.length >= quotientLimit) {
          return state;
        }
        const quotient = input.quotient + action.digit;
        // 商が埋まったら自動で「あまり」欄へ移り、タップし直す手間を省く。
        const focus =
          quotient.length >= quotientLimit ? "remainder" : "quotient";
        return { ...state, input: { ...input, quotient, focus } };
      }
      if (input.remainder.length >= REMAINDER_MAX_DIGITS) {
        return state;
      }
      return {
        ...state,
        input: { ...input, remainder: input.remainder + action.digit },
      };
    }

    case "BACKSPACE": {
      if (state.screen !== "playing") {
        return state;
      }
      const input = state.input;
      if (input.kind === "single") {
        if (input.value === "") {
          return state;
        }
        return {
          ...state,
          input: { ...input, value: input.value.slice(0, -1) },
        };
      }
      if (input.focus === "remainder") {
        if (input.remainder !== "") {
          return {
            ...state,
            input: { ...input, remainder: input.remainder.slice(0, -1) },
          };
        }
        // あまり欄が空なら、テキスト入力の慣習どおり商欄へ戻って1文字消す。
        if (input.quotient === "") {
          return state;
        }
        return {
          ...state,
          input: {
            ...input,
            quotient: input.quotient.slice(0, -1),
            focus: "quotient",
          },
        };
      }
      if (input.quotient === "") {
        return state;
      }
      return {
        ...state,
        input: { ...input, quotient: input.quotient.slice(0, -1) },
      };
    }

    case "CLEAR":
      if (state.screen !== "playing") {
        return state;
      }
      return { ...state, input: emptyInputFor(state.problem) };

    case "FOCUS_FIELD":
      if (
        state.screen !== "playing" ||
        state.input.kind !== "quotient-remainder"
      ) {
        return state;
      }
      return { ...state, input: { ...state.input, focus: action.field } };

    case "SUBMIT": {
      // 片方の欄だけの入力では判定しない (FR-006)。
      if (state.screen !== "playing" || !isInputComplete(state.input)) {
        return state;
      }
      const correct = isInputCorrect(state.problem, state.input);
      const finishesTimeAttack =
        correct &&
        state.mode.kind === "timeAttack" &&
        state.solved + 1 >= state.mode.target;
      return {
        ...state,
        screen: "feedback",
        result: correct ? "correct" : "wrong",
        feedbackStartedAt: action.now,
        // 所要時間は最終問題に正解した瞬間で確定する (FR-020)。
        finishedAt: finishesTimeAttack ? action.now : null,
      };
    }

    case "FEEDBACK_DONE": {
      if (state.screen !== "feedback") {
        return state;
      }
      const { feedbackStartedAt, result, finishedAt, ...session } = state;
      const feedbackPausedMs = Math.max(
        0,
        (action.now ?? feedbackStartedAt) - feedbackStartedAt,
      );
      if (result === "wrong") {
        // 同じ問題に再挑戦できるよう答えだけ空にする (FR-012)。
        return {
          ...session,
          screen: "playing",
          input: emptyInputFor(session.problem),
          pausedMs: session.pausedMs + feedbackPausedMs,
        };
      }
      if (
        session.mode.kind === "timeAttack" &&
        session.solved + 1 >= session.mode.target &&
        finishedAt !== null &&
        session.startedAt !== null
      ) {
        return {
          screen: "result",
          operation: session.operation,
          level: session.level,
          target: session.mode.target,
          elapsedMs: finishedAt - session.startedAt - session.pausedMs,
        };
      }
      if (!action.problem) {
        return state;
      }
      return {
        ...session,
        screen: "playing",
        problem: action.problem,
        input: emptyInputFor(action.problem),
        solved: session.solved + 1,
        lastSolved: session.problem,
        pausedMs: session.pausedMs + feedbackPausedMs,
      };
    }

    case "END_PRACTICE": {
      if (
        (state.screen !== "playing" && state.screen !== "feedback") ||
        state.mode.kind !== "practice"
      ) {
        return state;
      }
      // 正解表示中に終了した場合、その1問も成果に数えてあげる (FR-016)。
      const bonus =
        state.screen === "feedback" && state.result === "correct" ? 1 : 0;
      return {
        screen: "practice-summary",
        operation: state.operation,
        level: state.level,
        solved: state.solved + bonus,
      };
    }

    default:
      // 対応しない (state, action) の組は状態を変えない。カウントダウン・
      // 正誤表示・モード選択中のキー入力の無効化もこの規則に含まれる。
      return state;
  }
}
