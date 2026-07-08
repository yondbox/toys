// 自己ベスト記録の読み書き。演算×レベル×問題数の組ごとに独立して保持する
// (FR-021/025)。localStorage への実アクセスと名前空間・破損時の扱いは
// src/lib/storage.ts に委譲する (FR-031/032)。

import { readJSON, writeJSON } from "@/lib/storage";
import type { TimeAttackTarget } from "./game";
import type { Level, Operation } from "./operations";

export type BestRecord = { elapsedMs: number };

/** storage が接頭辞 toys: を付けるので、実キーは toys:keisan-game:best:... になる。 */
export function bestRecordKey(
  operation: Operation,
  level: Level,
  target: TimeAttackTarget,
): string {
  return `keisan-game:best:${operation}:${level}:${target}`;
}

function isBestRecord(value: unknown): value is BestRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const elapsedMs = (value as BestRecord).elapsedMs;
  return (
    typeof elapsedMs === "number" && Number.isFinite(elapsedMs) && elapsedMs > 0
  );
}

export function readBestRecord(
  operation: Operation,
  level: Level,
  target: TimeAttackTarget,
): BestRecord | null {
  return readJSON(bestRecordKey(operation, level, target), isBestRecord);
}

export type TimeAttackOutcome = {
  /** 今回より前の自己ベスト。初挑戦(または記録が壊れていた)なら null */
  previousBestMs: number | null;
  /** 既存の自己ベストをより速いタイムで更新したか (FR-023) */
  isNewRecord: boolean;
};

/**
 * タイムアタックの結果を記録へ反映する。初挑戦なら保存のみ、
 * 既存記録より速ければ更新する。遅ければ記録は変えない。
 */
export function recordTimeAttackResult(
  operation: Operation,
  level: Level,
  target: TimeAttackTarget,
  elapsedMs: number,
): TimeAttackOutcome {
  const key = bestRecordKey(operation, level, target);
  const previous = readBestRecord(operation, level, target);
  if (previous === null) {
    writeJSON(key, { elapsedMs });
    return { previousBestMs: null, isNewRecord: false };
  }
  if (elapsedMs < previous.elapsedMs) {
    writeJSON(key, { elapsedMs });
    return { previousBestMs: previous.elapsedMs, isNewRecord: true };
  }
  return { previousBestMs: previous.elapsedMs, isNewRecord: false };
}
