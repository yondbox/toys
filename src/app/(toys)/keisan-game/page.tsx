"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  COUNTDOWN_STEP_MS,
  FEEDBACK_MS,
  type GameState,
  gameReducer,
  initialState,
  TIME_ATTACK_TARGETS,
} from "./game";
import { Keypad } from "./Keypad";
import {
  generateProblem,
  LEVEL_META,
  LEVELS,
  type Level,
  OPERATION_META,
  OPERATIONS,
  type Operation,
} from "./operations";
import { recordTimeAttackResult, type TimeAttackOutcome } from "./records";

const operationTone: Record<Operation, string> = {
  add: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
  sub: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  mul: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  div: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  mix: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
};

function equation(
  state: Extract<GameState, { screen: "playing" | "feedback" }>,
) {
  const { a, b, op } = state.problem;
  return `${a} ${OPERATION_META[op].symbol} ${b} =`;
}

function answerValue(
  state: Extract<GameState, { screen: "playing" | "feedback" }>,
) {
  return state.input.kind === "single" ? state.input.value : "";
}

function activeElapsedMs(
  state: Extract<GameState, { screen: "playing" | "feedback" }>,
  currentNow: number,
) {
  if (state.startedAt === null) {
    return 0;
  }
  const endAt =
    state.screen === "feedback" ? state.feedbackStartedAt : currentNow;
  return Math.max(0, endAt - state.startedAt - state.pausedMs);
}

function isActiveSelection(current: string, value: string) {
  return current === value ? "true" : "false";
}

export default function KeisanGamePage() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [operation, setOperation] = useState<Operation>("add");
  const [level, setLevel] = useState<Level>("easy");
  const [now, setNow] = useState(() => Date.now());
  const [timeAttackOutcome, setTimeAttackOutcome] =
    useState<TimeAttackOutcome | null>(null);
  const recordedResultRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.screen !== "feedback") {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({
        type: "FEEDBACK_DONE",
        now: Date.now(),
        problem:
          state.result === "correct"
            ? generateProblem(state.operation, state.level, state.problem)
            : undefined,
      });
    }, FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state.screen !== "countdown") {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({
        type: "COUNTDOWN_TICK",
        now: Date.now(),
        problem: generateProblem(state.operation, state.level),
      });
    }, COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state.screen !== "playing" || state.mode.kind !== "timeAttack") {
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (state.screen !== "result") {
      recordedResultRef.current = null;
      setTimeAttackOutcome(null);
      return;
    }
    const signature = `${state.operation}:${state.level}:${state.target}:${state.elapsedMs}`;
    if (recordedResultRef.current === signature) {
      return;
    }
    recordedResultRef.current = signature;
    setTimeAttackOutcome(
      recordTimeAttackResult(
        state.operation,
        state.level,
        state.target,
        state.elapsedMs,
      ),
    );
  }, [state]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        dispatch({ type: "DIGIT", digit: event.key });
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "BACKSPACE" });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        dispatch({ type: "CLEAR" });
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "SUBMIT", now: Date.now() });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function startPractice() {
    dispatch({
      type: "START_PRACTICE",
      operation,
      level,
      problem: generateProblem(operation, level),
    });
  }

  function startTimeAttack(target: (typeof TIME_ATTACK_TARGETS)[number]) {
    dispatch({ type: "START_TIME_ATTACK", operation, level, target });
  }

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col overflow-x-hidden bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-8">
        <Link
          href="/"
          className="w-fit text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
        >
          ← toys
        </Link>
        {state.screen === "mode-select" ? (
          <section className="flex flex-1 flex-col gap-5 pt-4">
            <div>
              <p className="font-bold text-pink-600 text-sm dark:text-pink-300">
                えらんで はじめよう
              </p>
              <h1 className="mt-1 font-black text-[clamp(2rem,10vw,4.5rem)] leading-none">
                けいさんゲーム
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {OPERATIONS.map((op) => (
                <button
                  type="button"
                  key={op}
                  data-testid={`op-${op}`}
                  aria-pressed={isActiveSelection(operation, op)}
                  onClick={() => setOperation(op)}
                  className={`${operationTone[op]} rounded-2xl border-2 px-3 py-3 text-left shadow-sm aria-pressed:ring-4 aria-pressed:ring-zinc-900/15 dark:aria-pressed:ring-white/20`}
                >
                  <span className="block font-black text-3xl leading-none">
                    {OPERATION_META[op].symbol}
                  </span>
                  <span className="mt-2 block font-bold text-sm">
                    {OPERATION_META[op].label}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((item) => (
                <button
                  type="button"
                  key={item}
                  data-testid={`level-${item}`}
                  aria-pressed={isActiveSelection(level, item)}
                  onClick={() => setLevel(item)}
                  className="rounded-2xl border-2 border-zinc-200 bg-white px-3 py-3 font-bold text-zinc-700 shadow-sm aria-pressed:border-zinc-900 aria-pressed:bg-zinc-900 aria-pressed:text-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:aria-pressed:border-zinc-100 dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-950"
                >
                  <span className="block text-lg">
                    {LEVEL_META[item].stars}
                  </span>
                  <span className="block text-sm">
                    {LEVEL_META[item].label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-auto grid gap-2 pb-1 sm:grid-cols-4">
              <button
                type="button"
                data-testid="mode-practice"
                onClick={startPractice}
                className="rounded-2xl border-2 border-zinc-900 bg-zinc-900 px-5 py-4 font-black text-lg text-white shadow-sm dark:border-white dark:bg-white dark:text-zinc-950"
              >
                れんしゅう
              </button>
              {TIME_ATTACK_TARGETS.map((target) => (
                <button
                  type="button"
                  key={target}
                  data-testid={`mode-${target}`}
                  onClick={() => startTimeAttack(target)}
                  className="rounded-2xl border-2 border-zinc-200 bg-white px-5 py-4 font-black text-lg text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  {target}もん
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {state.screen === "countdown" ? (
          <section className="grid flex-1 place-items-center text-center">
            <div>
              <p className="font-bold text-zinc-500">はじまるよ</p>
              <p className="font-black text-[clamp(5rem,30vw,10rem)] leading-none">
                {state.remaining}
              </p>
            </div>
          </section>
        ) : null}

        {state.screen === "playing" || state.screen === "feedback" ? (
          <section className="flex flex-1 flex-col gap-3 pt-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                data-testid="back-button"
                onClick={() => dispatch({ type: "BACK_TO_MODE_SELECT" })}
                className="rounded-full border border-zinc-200 bg-white px-3 py-2 font-bold text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                もどる
              </button>
              {state.mode.kind === "practice" ? (
                <button
                  type="button"
                  data-testid="end-practice"
                  onClick={() => dispatch({ type: "END_PRACTICE" })}
                  className="rounded-full bg-pink-600 px-4 py-2 font-bold text-sm text-white"
                >
                  おわる
                </button>
              ) : (
                <div className="flex min-w-32 flex-col items-end gap-1">
                  <div
                    data-testid="progress"
                    className="h-2 w-28 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${(state.solved / state.mode.target) * 100}%`,
                      }}
                    />
                  </div>
                  <div data-testid="timer" className="font-bold text-sm">
                    {(activeElapsedMs(state, now) / 1000).toFixed(1)}
                    びょう
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div
                data-testid="equation"
                className="font-black text-[clamp(2.8rem,17vw,7rem)] leading-none"
              >
                {equation(state)}
              </div>
              {state.input.kind === "single" ? (
                <div
                  data-testid="answer"
                  className="min-h-20 min-w-40 rounded-3xl border-4 border-zinc-900 bg-white px-8 py-3 font-black text-[clamp(2.5rem,15vw,5rem)] leading-none shadow-sm dark:border-zinc-100 dark:bg-zinc-900"
                >
                  {answerValue(state)}
                </div>
              ) : (
                <div className="grid w-full max-w-sm grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="answer-quotient"
                    onClick={() =>
                      dispatch({ type: "FOCUS_FIELD", field: "quotient" })
                    }
                    className="min-h-20 rounded-3xl border-4 border-zinc-900 bg-white px-3 py-3 font-black text-[clamp(2rem,12vw,4rem)] leading-none shadow-sm dark:border-zinc-100 dark:bg-zinc-900"
                  >
                    {state.input.quotient}
                  </button>
                  <button
                    type="button"
                    data-testid="answer-remainder"
                    onClick={() =>
                      dispatch({ type: "FOCUS_FIELD", field: "remainder" })
                    }
                    className="min-h-20 rounded-3xl border-4 border-zinc-900 bg-white px-3 py-3 font-black text-[clamp(2rem,12vw,4rem)] leading-none shadow-sm dark:border-zinc-100 dark:bg-zinc-900"
                  >
                    {state.input.remainder}
                  </button>
                </div>
              )}
              {state.screen === "feedback" ? (
                <div
                  data-testid="feedback"
                  className={`rounded-full px-6 py-2 font-black text-xl ${
                    state.result === "correct"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200"
                  }`}
                >
                  {state.result === "correct" ? "〇 せいかい" : "× もういちど"}
                </div>
              ) : null}
            </div>

            <div className="pb-1">
              <Keypad
                onDigit={(digit) => dispatch({ type: "DIGIT", digit })}
                onBackspace={() => dispatch({ type: "BACKSPACE" })}
                onClear={() => dispatch({ type: "CLEAR" })}
                onSubmit={() => dispatch({ type: "SUBMIT", now: Date.now() })}
              />
            </div>
          </section>
        ) : null}

        {state.screen === "practice-summary" ? (
          <section className="grid flex-1 place-items-center text-center">
            <div>
              <p
                data-testid="practice-summary"
                className="font-black text-[clamp(2rem,12vw,5rem)] leading-tight"
              >
                {state.solved}もん できたね
              </p>
              <button
                type="button"
                data-testid="back-to-modes"
                onClick={() => dispatch({ type: "BACK_TO_MODE_SELECT" })}
                className="mt-8 rounded-full bg-zinc-900 px-6 py-3 font-bold text-white dark:bg-white dark:text-zinc-950"
              >
                ホーム
              </button>
            </div>
          </section>
        ) : null}

        {state.screen === "result" ? (
          <section className="grid flex-1 place-items-center text-center">
            <div>
              <p data-testid="result-time" className="font-black text-5xl">
                {(state.elapsedMs / 1000).toFixed(1)} びょう
              </p>
              <p data-testid="result-best" className="mt-4 font-bold">
                {timeAttackOutcome === null
                  ? "きろく中"
                  : timeAttackOutcome.previousBestMs === null
                    ? "はじめてのきろく"
                    : `ベスト ${(timeAttackOutcome.previousBestMs / 1000).toFixed(1)} びょう`}
              </p>
              {timeAttackOutcome?.isNewRecord ? (
                <p
                  data-testid="result-new-record"
                  className="mt-3 rounded-full bg-yellow-100 px-5 py-2 font-black text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
                >
                  ベストこうしん
                </p>
              ) : null}
              <button
                type="button"
                data-testid="retry"
                onClick={() => dispatch({ type: "RETRY" })}
                className="mt-8 rounded-full bg-zinc-900 px-6 py-3 font-bold text-white dark:bg-white dark:text-zinc-950"
              >
                もういちど
              </button>
              <button
                type="button"
                data-testid="back-to-modes"
                onClick={() => dispatch({ type: "BACK_TO_MODE_SELECT" })}
                className="mt-3 block w-full rounded-full border border-zinc-300 px-6 py-3 font-bold dark:border-zinc-700"
              >
                ホーム
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
