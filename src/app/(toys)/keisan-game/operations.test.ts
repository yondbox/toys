import { describe, expect, it } from "vitest";
import {
  CONCRETE_OPERATIONS,
  type ConcreteOperation,
  generateProblem,
  LEVELS,
  type Level,
  maxAnswerDigits,
  type Problem,
  REMAINDER_MAX_DIGITS,
} from "./operations";

/** テストを決定的にするための線形合同法 rng。 */
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** 各性質を十分な回数の抽選で確認する。 */
function sample(
  op: ConcreteOperation | "mix",
  level: Level,
  count = 300,
  seed = 42,
): Problem[] {
  const rng = seededRng(seed);
  const problems: Problem[] = [];
  for (let i = 0; i < count; i++) {
    problems.push(generateProblem(op, level, null, rng));
  }
  return problems;
}

function singleValue(problem: Problem): number {
  if (problem.answer.kind !== "single") {
    throw new Error(`単一の答えを期待: ${JSON.stringify(problem)}`);
  }
  return problem.answer.value;
}

describe("たしざんの出題範囲 (FR-003)", () => {
  it("やさしい: 1けた＋1けた", () => {
    for (const p of sample("add", "easy")) {
      expect(p.op).toBe("add");
      expect(p.a).toBeGreaterThanOrEqual(0);
      expect(p.a).toBeLessThanOrEqual(9);
      expect(p.b).toBeGreaterThanOrEqual(0);
      expect(p.b).toBeLessThanOrEqual(9);
      expect(singleValue(p)).toBe(p.a + p.b);
    }
  });

  it("ふつう: 繰り上がりがあり、答えは20まで", () => {
    for (const p of sample("add", "normal")) {
      expect(p.a).toBeLessThanOrEqual(9);
      expect(p.b).toBeLessThanOrEqual(9);
      // 繰り上がり = 1桁どうしで和が11以上
      expect(p.a + p.b).toBeGreaterThanOrEqual(11);
      expect(singleValue(p)).toBeLessThanOrEqual(20);
    }
  });

  it("むずかしい: 2けた＋2けた", () => {
    for (const p of sample("add", "hard")) {
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.a).toBeLessThanOrEqual(99);
      expect(p.b).toBeGreaterThanOrEqual(10);
      expect(p.b).toBeLessThanOrEqual(99);
    }
  });
});

describe("ひきざんの出題範囲 (FR-003/004)", () => {
  it("やさしい: 1けたどうしで答えが0以上", () => {
    for (const p of sample("sub", "easy")) {
      expect(p.a).toBeLessThanOrEqual(9);
      expect(p.b).toBeLessThanOrEqual(9);
      expect(singleValue(p)).toBe(p.a - p.b);
      expect(singleValue(p)).toBeGreaterThanOrEqual(0);
    }
  });

  it("ふつう: 20までの繰り下がりで答えが0以上", () => {
    for (const p of sample("sub", "normal")) {
      expect(p.a).toBeLessThanOrEqual(20);
      // 繰り下がり = 一の位だけでは引けない
      expect(p.a % 10).toBeLessThan(p.b);
      expect(singleValue(p)).toBeGreaterThanOrEqual(0);
    }
  });

  it("むずかしい: 2けた−2けたで答えが0以上", () => {
    for (const p of sample("sub", "hard")) {
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.a).toBeLessThanOrEqual(99);
      expect(p.b).toBeGreaterThanOrEqual(10);
      expect(p.b).toBeLessThanOrEqual(99);
      expect(singleValue(p)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("かけざんの出題範囲 (FR-003)", () => {
  it("やさしい: 九九(1〜9の段)", () => {
    for (const p of sample("mul", "easy")) {
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(9);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeLessThanOrEqual(9);
      expect(singleValue(p)).toBe(p.a * p.b);
    }
  });

  it("ふつう: 2けた×1けた", () => {
    for (const p of sample("mul", "normal")) {
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.a).toBeLessThanOrEqual(99);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeLessThanOrEqual(9);
    }
  });

  it("むずかしい: 2けた×2けた", () => {
    for (const p of sample("mul", "hard")) {
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.b).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("わりざんの出題範囲 (FR-003/004)", () => {
  it("やさしい: 九九の逆で割り切れ、0で割らない", () => {
    for (const p of sample("div", "easy")) {
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeLessThanOrEqual(9);
      expect(p.a % p.b).toBe(0);
      expect(singleValue(p)).toBeGreaterThanOrEqual(1);
      expect(singleValue(p)).toBeLessThanOrEqual(9);
    }
  });

  it("ふつう: 2けた÷1けたで割り切れ、0で割らない", () => {
    for (const p of sample("div", "normal")) {
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.a).toBeLessThanOrEqual(99);
      expect(p.b).toBeGreaterThanOrEqual(2);
      expect(p.b).toBeLessThanOrEqual(9);
      expect(p.a % p.b).toBe(0);
    }
  });

  it("むずかしい: あまりのあるわり算(あまりは1以上・除数未満)", () => {
    for (const p of sample("div", "hard")) {
      if (p.answer.kind !== "quotient-remainder") {
        throw new Error("商とあまりの答えを期待");
      }
      expect(p.b).toBeGreaterThanOrEqual(2);
      const { quotient, remainder } = p.answer;
      expect(remainder).toBeGreaterThanOrEqual(1);
      expect(remainder).toBeLessThan(p.b);
      expect(quotient * p.b + remainder).toBe(p.a);
    }
  });
});

describe("ミックス (FR-003)", () => {
  it("4演算すべてがランダムに出題される", () => {
    const seen = new Set(sample("mix", "easy", 400).map((p) => p.op));
    for (const op of CONCRETE_OPERATIONS) {
      expect(seen.has(op), `mix に ${op} が含まれる`).toBe(true);
    }
  });

  it("ひき算・わり算の制約はミックスでも守られる (FR-004)", () => {
    for (const p of sample("mix", "easy", 400)) {
      if (p.op === "sub") {
        expect(singleValue(p)).toBeGreaterThanOrEqual(0);
      }
      if (p.op === "div") {
        expect(p.b).toBeGreaterThanOrEqual(1);
        expect(p.a % p.b).toBe(0);
      }
    }
  });
});

describe("直前と同じ問題を出さない (FR-005)", () => {
  it("同じ2数・同じ演算は連続しない", () => {
    const rng = seededRng(7);
    let previous = generateProblem("add", "easy", null, rng);
    for (let i = 0; i < 300; i++) {
      const next = generateProblem("add", "easy", previous, rng);
      const same =
        next.op === previous.op &&
        next.a === previous.a &&
        next.b === previous.b;
      expect(same).toBe(false);
      previous = next;
    }
  });
});

describe("答えの最大桁数 (FR-010)", () => {
  it("演算×レベルごとに答えが桁数上限に収まる", () => {
    for (const op of CONCRETE_OPERATIONS) {
      for (const level of LEVELS) {
        const digits = maxAnswerDigits(op, level);
        expect(digits).toBeGreaterThanOrEqual(1);
        for (const p of sample(op, level, 100, 11)) {
          if (p.answer.kind === "single") {
            expect(String(p.answer.value).length).toBeLessThanOrEqual(digits);
          } else {
            expect(String(p.answer.quotient).length).toBeLessThanOrEqual(
              digits,
            );
            expect(String(p.answer.remainder).length).toBeLessThanOrEqual(
              REMAINDER_MAX_DIGITS,
            );
          }
        }
      }
    }
  });
});
