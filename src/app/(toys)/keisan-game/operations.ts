// 演算×レベルの出題規則。React・DOM に依存しない純関数群。
// 乱数は rng 引数で注入し、テストを決定的にできるようにする。
// 低学年への配慮 (FR-004): ひき算は答えが0以上、わり算は割り切れる問題のみ
// (あまりレベルを除く)、0で割る問題は生成しない。各生成器がこれを保証する。

export type ConcreteOperation = "add" | "sub" | "mul" | "div";
export type Operation = ConcreteOperation | "mix";
export type Level = "easy" | "normal" | "hard";

export const CONCRETE_OPERATIONS: readonly ConcreteOperation[] = [
  "add",
  "sub",
  "mul",
  "div",
];
export const OPERATIONS: readonly Operation[] = [...CONCRETE_OPERATIONS, "mix"];
export const LEVELS: readonly Level[] = ["easy", "normal", "hard"];

export const OPERATION_META: Record<
  Operation,
  { label: string; symbol: string }
> = {
  add: { label: "たしざん", symbol: "＋" },
  sub: { label: "ひきざん", symbol: "−" },
  mul: { label: "かけざん", symbol: "×" },
  div: { label: "わりざん", symbol: "÷" },
  mix: { label: "ミックス", symbol: "＋−×÷" },
};

export const LEVEL_META: Record<Level, { label: string; stars: string }> = {
  easy: { label: "やさしい", stars: "★" },
  normal: { label: "ふつう", stars: "★★" },
  hard: { label: "むずかしい", stars: "★★★" },
};

export type Answer =
  | { kind: "single"; value: number }
  | { kind: "quotient-remainder"; quotient: number; remainder: number };

export type Problem = {
  op: ConcreteOperation;
  a: number;
  b: number;
  answer: Answer;
};

type Rng = () => number;

/** min〜max(両端を含む)の整数を1つ引く。 */
function intBetween(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function single(op: ConcreteOperation, a: number, b: number): Problem {
  const value =
    op === "add" ? a + b : op === "sub" ? a - b : op === "mul" ? a * b : a / b;
  return { op, a, b, answer: { kind: "single", value } };
}

function generateAdd(level: Level, rng: Rng): Problem {
  if (level === "easy") {
    return single("add", intBetween(0, 9, rng), intBetween(0, 9, rng));
  }
  if (level === "normal") {
    // 繰り上がりのあるたし算(1年生)。1桁どうしで必ず和が11以上になる組を
    // 直接構成する(a を先に引き、b は繰り上がる範囲から引く)。答えは最大18。
    const a = intBetween(2, 9, rng);
    const b = intBetween(Math.max(11 - a, 2), 9, rng);
    return single("add", a, b);
  }
  return single("add", intBetween(10, 99, rng), intBetween(10, 99, rng));
}

function generateSub(level: Level, rng: Rng): Problem {
  if (level === "easy") {
    const x = intBetween(0, 9, rng);
    const y = intBetween(0, 9, rng);
    // 答えが負にならないよう大きい方から引く (FR-004)
    return single("sub", Math.max(x, y), Math.min(x, y));
  }
  if (level === "normal") {
    // 繰り下がりのあるひき算(1年生)。11〜18 から1桁を引き、一の位だけでは
    // 引けない(= b が一の位より大きい)組を直接構成する。答えは2〜9。
    const a = intBetween(11, 18, rng);
    const b = intBetween((a % 10) + 1, 9, rng);
    return single("sub", a, b);
  }
  const x = intBetween(10, 99, rng);
  const y = intBetween(10, 99, rng);
  return single("sub", Math.max(x, y), Math.min(x, y));
}

function generateMul(level: Level, rng: Rng): Problem {
  if (level === "easy") {
    return single("mul", intBetween(1, 9, rng), intBetween(1, 9, rng));
  }
  if (level === "normal") {
    return single("mul", intBetween(10, 99, rng), intBetween(1, 9, rng));
  }
  return single("mul", intBetween(10, 99, rng), intBetween(10, 99, rng));
}

function generateDiv(level: Level, rng: Rng): Problem {
  if (level === "easy") {
    // 九九の逆。商と除数から被除数を作るので、必ず割り切れて0除算もない。
    const quotient = intBetween(1, 9, rng);
    const b = intBetween(1, 9, rng);
    return single("div", quotient * b, b);
  }
  if (level === "normal") {
    // 2けた÷1けたで割り切れる問題。商の範囲は被除数が2けたに収まるように選ぶ。
    const b = intBetween(2, 9, rng);
    const quotient = intBetween(Math.ceil(10 / b), Math.floor(99 / b), rng);
    return single("div", quotient * b, b);
  }
  // あまりのあるわり算。2けた÷1けたで、あまりが必ず1以上になるまで引き直す。
  while (true) {
    const b = intBetween(2, 9, rng);
    const a = intBetween(10, 99, rng);
    const remainder = a % b;
    if (remainder === 0) {
      continue;
    }
    return {
      op: "div",
      a,
      b,
      answer: {
        kind: "quotient-remainder",
        quotient: Math.floor(a / b),
        remainder,
      },
    };
  }
}

const GENERATORS: Record<
  ConcreteOperation,
  (level: Level, rng: Rng) => Problem
> = {
  add: generateAdd,
  sub: generateSub,
  mul: generateMul,
  div: generateDiv,
};

/**
 * 答えとして入力できる最大桁数 (FR-010)。あまりのあるわり算では「こたえ」(商)欄の
 * 上限を表し、「あまり」欄は REMAINDER_MAX_DIGITS を使う。
 */
export function maxAnswerDigits(op: ConcreteOperation, level: Level): number {
  const table: Record<ConcreteOperation, Record<Level, number>> = {
    add: { easy: 2, normal: 2, hard: 3 },
    sub: { easy: 1, normal: 1, hard: 2 },
    mul: { easy: 2, normal: 3, hard: 4 },
    div: { easy: 1, normal: 2, hard: 2 },
  };
  return table[op][level];
}

/** あまりは除数(最大9)より小さいので常に1桁。 */
export const REMAINDER_MAX_DIGITS = 1;

/**
 * 問題を1問生成する。ミックスは4演算から等確率で選んで実体化する。
 * FR-005: 直前に正解した問題(exclude)と同じ2数・同じ演算は再抽選で避ける。
 * 除外対象は高々1組なので再抽選で十分だが、退行で無限ループしないよう
 * 上限を設け、超えたら最後の候補をそのまま返す。
 */
export function generateProblem(
  operation: Operation,
  level: Level,
  exclude: Problem | null = null,
  rng: Rng = Math.random,
): Problem {
  let candidate: Problem;
  let attempts = 0;
  do {
    const op =
      operation === "mix"
        ? CONCRETE_OPERATIONS[intBetween(0, 3, rng)]
        : operation;
    candidate = GENERATORS[op](level, rng);
    attempts++;
  } while (
    attempts < 100 &&
    exclude !== null &&
    candidate.op === exclude.op &&
    candidate.a === exclude.a &&
    candidate.b === exclude.b
  );
  return candidate;
}
