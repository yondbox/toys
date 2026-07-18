import { afterEach, describe, expect, it, vi } from "vitest";
import { readJSON, readString, writeJSON, writeString } from "./storage";

/**
 * JSON 保存テストで使う自己ベスト風の型。
 *
 * storage 層が keisan-game 固有型を import しないことを保つため、テスト内だけの最小型にしている。
 */
type Best = {
  /** JSON の型ガード対象にする保存時間（ミリ秒）。 */
  elapsedMs: number;
};

/**
 * `Best` として読める値かを判定するテスト用型ガード。
 *
 * `readJSON` が呼び出し側の型ガードへ検証を委譲することを確認する。
 */
function isBest(value: unknown): value is Best {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Best).elapsedMs === "number"
  );
}

/**
 * localStorage と mock をテスト間で初期化する。
 *
 * storage 例外の spy と保存値が残ると、後続ケースのフォールバック検証が汚れるため毎回戻す。
 */
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("名前空間 (FR-031)", () => {
  it("書き込みキーには常に toys: 接頭辞が付く", () => {
    writeString("theme", "dark");
    expect(localStorage.getItem("toys:theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("読み出しも toys: 接頭辞のキーから行う", () => {
    localStorage.setItem("toys:theme", "light");
    expect(readString("theme")).toBe("light");
  });

  it("他のおもちゃ・他アプリのキーには触れない", () => {
    localStorage.setItem("someone-elses-data", "keep");
    writeJSON("keisan-game:best:add:easy:10", { elapsedMs: 1200 });
    expect(localStorage.getItem("someone-elses-data")).toBe("keep");
  });
});

describe("JSON の読み書き", () => {
  it("書いた値を型ガード付きで読み戻せる", () => {
    writeJSON("keisan-game:best:add:easy:10", { elapsedMs: 1200 });
    expect(readJSON("keisan-game:best:add:easy:10", isBest)).toEqual({
      elapsedMs: 1200,
    });
  });

  it("未保存のキーは null を返す", () => {
    expect(readJSON("keisan-game:best:add:easy:10", isBest)).toBeNull();
  });

  it("壊れた JSON は null にフォールバックする (FR-032)", () => {
    localStorage.setItem("toys:keisan-game:best:add:easy:10", "{oops");
    expect(readJSON("keisan-game:best:add:easy:10", isBest)).toBeNull();
  });

  it("型ガードを通らない値は null にフォールバックする (FR-032)", () => {
    localStorage.setItem(
      "toys:keisan-game:best:add:easy:10",
      JSON.stringify({ elapsedMs: "fast" }),
    );
    expect(readJSON("keisan-game:best:add:easy:10", isBest)).toBeNull();
  });
});

describe("保存領域が使えない環境 (FR-032)", () => {
  it("読み出しが例外を投げず null を返す", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(readString("theme")).toBeNull();
  });

  it("書き込みが例外を投げず黙って諦める", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => writeString("theme", "dark")).not.toThrow();
    expect(() => writeJSON("x", { a: 1 })).not.toThrow();
  });

  it("JSON 化できない値でも例外を投げず黙って諦める", () => {
    /** JSON.stringify が例外を投げる循環参照値。 */
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => writeJSON("x", cyclic)).not.toThrow();
    expect(localStorage.getItem("toys:x")).toBeNull();
  });
});
