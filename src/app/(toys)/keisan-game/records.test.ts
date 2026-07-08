import { afterEach, describe, expect, it } from "vitest";
import {
  bestRecordKey,
  readBestRecord,
  recordTimeAttackResult,
} from "./records";

afterEach(() => {
  localStorage.clear();
});

describe("自己ベストのキー (FR-021/025/031)", () => {
  it("演算・レベル・問題数の組ごとに toys: 名前空間のキーを持つ", () => {
    recordTimeAttackResult("add", "easy", 10, 12345);
    expect(localStorage.getItem("toys:keisan-game:best:add:easy:10")).toBe(
      JSON.stringify({ elapsedMs: 12345 }),
    );
  });

  it("組み合わせが異なる記録は互いに混ざらない (FR-025)", () => {
    recordTimeAttackResult("add", "easy", 10, 1000);
    recordTimeAttackResult("add", "easy", 30, 2000);
    recordTimeAttackResult("sub", "easy", 10, 3000);
    recordTimeAttackResult("add", "hard", 10, 4000);
    expect(readBestRecord("add", "easy", 10)).toEqual({ elapsedMs: 1000 });
    expect(readBestRecord("add", "easy", 30)).toEqual({ elapsedMs: 2000 });
    expect(readBestRecord("sub", "easy", 10)).toEqual({ elapsedMs: 3000 });
    expect(readBestRecord("add", "hard", 10)).toEqual({ elapsedMs: 4000 });
  });
});

describe("記録の更新 (FR-022/023)", () => {
  it("初挑戦は保存され、更新扱いにはならない", () => {
    const outcome = recordTimeAttackResult("add", "easy", 10, 9000);
    expect(outcome).toEqual({ previousBestMs: null, isNewRecord: false });
    expect(readBestRecord("add", "easy", 10)).toEqual({ elapsedMs: 9000 });
  });

  it("より速いタイムはベストを更新し、お祝いの対象になる", () => {
    recordTimeAttackResult("add", "easy", 10, 9000);
    const outcome = recordTimeAttackResult("add", "easy", 10, 7500);
    expect(outcome).toEqual({ previousBestMs: 9000, isNewRecord: true });
    expect(readBestRecord("add", "easy", 10)).toEqual({ elapsedMs: 7500 });
  });

  it("遅いタイムでは記録を変えない", () => {
    recordTimeAttackResult("add", "easy", 10, 7500);
    const outcome = recordTimeAttackResult("add", "easy", 10, 9999);
    expect(outcome).toEqual({ previousBestMs: 7500, isNewRecord: false });
    expect(readBestRecord("add", "easy", 10)).toEqual({ elapsedMs: 7500 });
  });
});

describe("壊れた保存値 (FR-032)", () => {
  it("破損した記録は無いものとして扱い、今回のタイムで上書きする", () => {
    localStorage.setItem(`toys:${bestRecordKey("add", "easy", 10)}`, "{oops");
    expect(readBestRecord("add", "easy", 10)).toBeNull();
    const outcome = recordTimeAttackResult("add", "easy", 10, 8000);
    expect(outcome).toEqual({ previousBestMs: null, isNewRecord: false });
    expect(readBestRecord("add", "easy", 10)).toEqual({ elapsedMs: 8000 });
  });

  it("形式が想定外の記録も既定(記録なし)へフォールバックする", () => {
    localStorage.setItem(
      `toys:${bestRecordKey("add", "easy", 10)}`,
      JSON.stringify({ elapsedMs: "fast" }),
    );
    expect(readBestRecord("add", "easy", 10)).toBeNull();
  });
});
