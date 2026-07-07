"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import {
  COUNTDOWN_STEP_MS,
  DIFFICULTIES,
  type Difficulty,
  FEEDBACK_MS,
  type GameState,
  gameReducer,
  generateProblem,
  initialState,
  TIME_ATTACK_TARGETS,
  TIMER_DISPLAY_INTERVAL_MS,
  type TimeAttackTarget,
} from "./game";

type SessionState = Extract<GameState, { screen: "playing" | "feedback" }>;

export default function AdditionGamePage() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  // モード選択画面で選ぶ難易度。セッション開始時に state へ確定する (FR-024)。
  const [difficulty, setDifficulty] = useState<Difficulty>("basic");

  // 回答操作は画面のどこにフォーカスがあっても受け付ける (FR-005)。
  // playing 以外では張らないので、カウントダウン・正誤表示中のキーは届かない。
  useEffect(() => {
    if (state.screen !== "playing") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      // ブラウザのショートカット(Cmd+R など)を妨げない。
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        dispatch({ type: "DIGIT", digit: event.key });
      } else if (event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "SUBMIT", now: Date.now() });
      } else if (event.key === "Escape") {
        event.preventDefault();
        dispatch({ type: "CLEAR" });
      } else if (event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "BACKSPACE" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.screen]);

  // 正誤表示は FEEDBACK_MS 後に自動で閉じる。次の問題はここで生成して
  // アクションに載せる(reducer を純関数に保つため。FR-020 の除外も渡す)。
  useEffect(() => {
    if (state.screen !== "feedback") {
      return;
    }
    const { difficulty, problem, result } = state;
    const timeout = setTimeout(() => {
      dispatch({
        type: "FEEDBACK_DONE",
        problem:
          result === "correct"
            ? generateProblem(difficulty, problem)
            : undefined,
      });
    }, FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [state]);

  // カウントダウンは 3・2・1 を各1秒表示する (FR-012)。最後のティックが
  // 最初の問題とタイマー起点(now)を運ぶ。
  useEffect(() => {
    if (state.screen !== "countdown") {
      return;
    }
    const { difficulty } = state;
    const timeout = setTimeout(() => {
      dispatch({
        type: "COUNTDOWN_TICK",
        now: Date.now(),
        problem: generateProblem(difficulty),
      });
    }, COUNTDOWN_STEP_MS);
    return () => clearTimeout(timeout);
  }, [state]);

  const inSession = state.screen === "playing" || state.screen === "feedback";
  const session = inSession ? (state as SessionState) : null;

  // 経過時間の表示だけを 100ms 間隔で再描画する。計測はタイムスタンプ差分で
  // 行うため、この間隔は精度に影響しない (FR-014)。
  const [displayNow, setDisplayNow] = useState(0);
  const timeAttackRunning = session !== null && session.startedAt !== null;
  useEffect(() => {
    if (!timeAttackRunning) {
      return;
    }
    const interval = setInterval(() => {
      setDisplayNow(Date.now());
    }, TIMER_DISPLAY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [timeAttackRunning]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      {/* 戻る操作は全画面で同じ位置・寸法に固定し、モード選択では不可視にする (FR-023)。*/}
      <header className="flex h-16 shrink-0 items-center px-4 sm:px-6">
        <button
          type="button"
          data-testid="back-button"
          onClick={() => dispatch({ type: "BACK_TO_MODE_SELECT" })}
          className={`shrink-0 whitespace-nowrap rounded-lg border-2 border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-500 sm:px-4 sm:text-base dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-400 ${
            state.screen === "mode-select" ? "invisible" : ""
          }`}
        >
          ← モードせんたくへ もどる
        </button>
      </header>
      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 pb-16">
        {state.screen === "mode-select" && (
          <ModeSelect
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            onStartFree={() =>
              dispatch({
                type: "START_FREE",
                difficulty,
                problem: generateProblem(difficulty),
              })
            }
            onStartTimeAttack={(target) =>
              dispatch({
                type: "START_TIME_ATTACK",
                difficulty,
                target,
              })
            }
          />
        )}
        {state.screen === "countdown" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              まもなく はじまるよ
            </p>
            <div
              data-testid="countdown-number"
              className="text-9xl font-bold leading-none tabular-nums text-blue-700 dark:text-blue-400"
            >
              {state.remaining}
            </div>
          </div>
        )}
        {session && (
          <PlayArea
            state={session}
            elapsedMs={sessionElapsedMs(session, displayNow)}
          />
        )}
        {state.screen === "result" && (
          <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
            <h2 className="text-3xl font-bold">けっか</h2>
            <p data-testid="result-count" className="text-2xl font-bold">
              {state.target}もん せいかい！
            </p>
            <p data-testid="result-time" className="text-xl tabular-nums">
              きろく: {formatSeconds(state.elapsedMs)}びょう
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                data-testid="retry"
                onClick={() => dispatch({ type: "RETRY" })}
                className="flex-1 rounded-2xl bg-blue-700 px-6 py-4 text-xl font-bold text-white transition-colors hover:bg-blue-800"
              >
                もういちど ちょうせん
              </button>
              <button
                type="button"
                data-testid="back-to-modes"
                onClick={() => dispatch({ type: "BACK_TO_MODE_SELECT" })}
                className="flex-1 rounded-2xl bg-emerald-700 px-6 py-4 text-xl font-bold text-white transition-colors hover:bg-emerald-800"
              >
                モードせんたくへ
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/** 表示用の経過時間。最終問題の正解後は finishedAt で固定される (FR-013)。 */
function sessionElapsedMs(session: SessionState, displayNow: number): number {
  if (session.startedAt === null) {
    return 0;
  }
  const end =
    session.screen === "feedback" && session.finishedAt !== null
      ? session.finishedAt
      : displayNow;
  return Math.max(0, end - session.startedAt);
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}

function ModeSelect({
  difficulty,
  onSelectDifficulty,
  onStartFree,
  onStartTimeAttack,
}: {
  difficulty: Difficulty;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onStartFree: () => void;
  onStartTimeAttack: (target: TimeAttackTarget) => void;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">
          たしざんタイムアタック
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          あそびかたを えらんでね
        </p>
      </div>
      <div className="w-full">
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          むずかしさ
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["basic", "advanced"] as const).map((value) => {
            const selected = difficulty === value;
            return (
              <button
                key={value}
                type="button"
                data-testid={`difficulty-${value}`}
                aria-pressed={selected}
                onClick={() => onSelectDifficulty(value)}
                className={`rounded-2xl border-4 px-4 py-3 text-lg font-bold transition-colors ${
                  selected
                    ? "border-zinc-800 bg-zinc-800 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-black"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                {DIFFICULTIES[value].label}
                <span className="mt-1 block text-xs font-semibold opacity-80">
                  {value === "basic" ? "1けたのたしざん" : "2けたのたしざん"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        data-testid="mode-free"
        onClick={onStartFree}
        className="w-full rounded-2xl bg-emerald-700 px-6 py-4 text-xl font-bold text-white transition-colors hover:bg-emerald-800"
      >
        じゆうれんしゅう
      </button>
      <div className="w-full">
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          タイムアタック(もんだいの かずを えらぶ)
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TIME_ATTACK_TARGETS.map((target) => (
            <button
              key={target}
              type="button"
              data-testid={`mode-${target}`}
              onClick={() => onStartTimeAttack(target)}
              className="rounded-2xl bg-blue-700 px-6 py-4 text-xl font-bold text-white transition-colors hover:bg-blue-800"
            >
              {target}もん
            </button>
          ))}
        </div>
      </div>
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
      >
        ← toys
      </Link>
    </div>
  );
}

function PlayArea({
  state,
  elapsedMs,
}: {
  state: SessionState;
  elapsedMs: number;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center">
      {state.mode.kind === "timeAttack" && (
        <div
          data-testid="hud"
          className="mb-10 flex w-full items-baseline justify-between text-lg font-bold tabular-nums sm:text-xl"
        >
          <span data-testid="progress">
            {state.solved} / {state.mode.target}もん
          </span>
          <span data-testid="timer" className="min-w-[9ch] text-right">
            {formatSeconds(elapsedMs)}びょう
          </span>
        </div>
      )}
      {/* 正誤オーバーレイはこの枠にだけ重ね、HUD(進捗・タイマー)は隠さない (FR-014)。*/}
      <div className="relative flex w-full flex-col items-center">
        <div
          data-testid="equation"
          className="text-5xl font-bold tabular-nums sm:text-7xl"
        >
          {state.problem.a} + {state.problem.b} =
        </div>
        <output
          data-testid="answer"
          className="mt-6 flex h-[1.5em] min-w-[3.4ch] items-center justify-center rounded-2xl border-4 border-zinc-300 bg-white px-[0.4em] text-5xl font-bold tabular-nums sm:text-7xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          {state.answer}
        </output>
        {state.screen === "feedback" && (
          <FeedbackOverlay result={state.result} />
        )}
      </div>
    </div>
  );
}

function FeedbackOverlay({ result }: { result: "correct" | "wrong" }) {
  const correct = result === "correct";
  return (
    <div
      data-testid="feedback"
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl ${
        correct
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
      }`}
    >
      <div className="text-7xl font-bold leading-none sm:text-9xl">
        {correct ? "〇" : "×"}
      </div>
      <div className="mt-2 text-3xl font-bold sm:text-4xl">
        {correct ? "せいかい！" : "もういちど"}
      </div>
    </div>
  );
}
