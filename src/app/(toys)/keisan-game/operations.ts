/**
 * 実際に式として出題する4演算。
 *
 * `"mix"` はユーザーが選ぶモードであり、問題生成時にはこのいずれかへ解決する。
 */
export type ConcreteOperation = "add" | "sub" | "mul" | "div";

/**
 * ユーザーがホーム画面で選べる演算。
 *
 * ミックスを UI と状態に残すことで、同じ reducer/action で通常演算と混合演算を扱う。
 */
export type Operation = ConcreteOperation | "mix";

/**
 * 出題範囲を決める難易度。
 *
 * 仕様上は低学年向けの段階的な範囲で、各生成器がこの値を見て問題の数値域を選ぶ。
 */
export type Level = "easy" | "normal" | "hard";

/**
 * ミックスモードが抽選対象にする実演算の一覧。
 *
 * UI 表示用の `OPERATIONS` と分け、生成器が `"mix"` を再帰的に引かないようにする。
 */
export const CONCRETE_OPERATIONS: readonly ConcreteOperation[] = [
  "add",
  "sub",
  "mul",
  "div",
];

/**
 * ホーム画面で表示する演算選択肢。
 *
 * 登録順をそのままボタン順に使うため、子どもが見慣れた四則演算の後にミックスを置く。
 */
export const OPERATIONS: readonly Operation[] = [...CONCRETE_OPERATIONS, "mix"];

/**
 * ホーム画面で表示する難易度選択肢。
 *
 * 配列順を UI の並びとテストの網羅対象に共有し、登録漏れを防ぐ。
 */
export const LEVELS: readonly Level[] = ["easy", "normal", "hard"];

/**
 * 演算ごとの表示ラベルと記号。
 *
 * 問題文・選択ボタン・テストの読み取り対象を同じメタデータから作り、
 * 記号の不一致で正答計算がずれるのを避ける。
 */
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

/**
 * 難易度ごとの表示ラベルと星表現。
 *
 * 子ども向け UI では説明文より視覚的な段階表示を優先するため、星もデータとして持つ。
 */
export const LEVEL_META: Record<Level, { label: string; stars: string }> = {
  easy: { label: "やさしい", stars: "★" },
  normal: { label: "ふつう", stars: "★★" },
  hard: { label: "むずかしい", stars: "★★★" },
};

/**
 * 問題の正答形式。
 *
 * あまりのあるわり算だけ商とあまりを別欄で入力するため、単一値と別型にして
 * UI と reducer が入力欄の数を安全に分岐できるようにする。
 */
export type Answer =
  | { kind: "single"; value: number }
  | { kind: "quotient-remainder"; quotient: number; remainder: number };

/**
 * 画面に出す1問の完全なデータ。
 *
 * `op` は常に実演算へ解決済みにして、ミックスで出た問題も採点と表示で同じ経路を通す。
 */
export type Problem = {
  op: ConcreteOperation;
  a: number;
  b: number;
  answer: Answer;
};

/**
 * 問題生成へ注入する乱数関数。
 *
 * `Math.random` を直接使わず引数にすることで、ユニットテストが出題範囲を決定的に検証できる。
 */
type Rng = () => number;

/**
 * `min` から `max` まで両端を含む整数を1つ引く。
 *
 * 各生成器で同じ境界処理を使い、出題範囲の off-by-one を局所化する。
 */
function intBetween(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * 商とあまりを持たない通常問題を組み立てる。
 *
 * 生成器が数値範囲だけに集中できるよう、四則演算の答え計算をこの関数へまとめる。
 */
function single(op: ConcreteOperation, a: number, b: number): Problem {
  const value =
    op === "add" ? a + b : op === "sub" ? a - b : op === "mul" ? a * b : a / b;
  return { op, a, b, answer: { kind: "single", value } };
}

/**
 * たし算の問題を難易度別に生成する。
 *
 * ふつうでは繰り上がりのある組を直接作り、抽選し直しに頼らず仕様の範囲を保証する。
 */
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

/**
 * ひき算の問題を難易度別に生成する。
 *
 * 低学年向けに答えが負にならないことを生成時点で保証し、採点側に補正を持ち込まない。
 */
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

/**
 * かけ算の問題を難易度別に生成する。
 *
 * やさしいでは九九、以降は桁数を増やすだけにして、他演算より単純な段階設計にしている。
 */
function generateMul(level: Level, rng: Rng): Problem {
  if (level === "easy") {
    return single("mul", intBetween(1, 9, rng), intBetween(1, 9, rng));
  }
  if (level === "normal") {
    return single("mul", intBetween(10, 99, rng), intBetween(1, 9, rng));
  }
  return single("mul", intBetween(10, 99, rng), intBetween(10, 99, rng));
}

/**
 * わり算の問題を難易度別に生成する。
 *
 * 0除算と意図しない小数答えを避けるため、割り切れる問題は商と除数から被除数を作る。
 * hard だけは仕様どおり、あまりが1以上になる問題を返す。
 */
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

/**
 * 実演算から対応する生成器を引くためのディスパッチ表。
 *
 * `switch` を問題生成本体から外し、演算追加時に更新すべき場所を明確にする。
 */
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
 *
 * 入力欄側で桁数を制限するため、問題生成範囲と同じ表をここに明示している。
 */
export function maxAnswerDigits(op: ConcreteOperation, level: Level): number {
  /**
   * 演算×難易度ごとの入力上限。
   *
   * 生成器の範囲変更時に同時更新すべき仕様表として、関数内に閉じ込めている。
   */
  const table: Record<ConcreteOperation, Record<Level, number>> = {
    add: { easy: 2, normal: 2, hard: 3 },
    sub: { easy: 1, normal: 1, hard: 2 },
    mul: { easy: 2, normal: 3, hard: 4 },
    div: { easy: 1, normal: 2, hard: 2 },
  };
  return table[op][level];
}

/**
 * あまり欄に入力できる最大桁数。
 *
 * 除数を最大9に固定しているため、正しいあまりは常に1桁で収まる。
 */
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
  /** 現在の抽選で得た候補。除外対象と一致した場合だけ引き直す。 */
  let candidate: Problem;
  /** 乱数の偏りや退行で無限ループしないための試行回数。 */
  let attempts = 0;
  do {
    /** ミックス選択時に実際の出題演算へ解決した値。 */
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
