import { readJSON, writeJSON } from "@/lib/storage";
import type { TimeAttackTarget } from "./game";
import type { Level, Operation } from "./operations";

/**
 * タイムアタックの自己ベスト記録。
 *
 * 保存値を最小限にして、将来表示文言が変わっても localStorage の互換性を保ちやすくする。
 */
export type BestRecord = {
  /** 正誤フィードバック時間を除いた自己ベスト時間（ミリ秒）。 */
  elapsedMs: number;
};

/**
 * 演算・難易度・問題数の組み合わせごとの記録キーを作る。
 *
 * `src/lib/storage.ts` が `toys:` を付けるため、この関数はアプリ内の論理キーだけを返す。
 * これにより他のおもちゃや別条件の記録と混ざらない。
 */
export function bestRecordKey(
  operation: Operation,
  level: Level,
  target: TimeAttackTarget,
): string {
  return `keisan-game:best:${operation}:${level}:${target}`;
}

/**
 * localStorage から読んだ unknown 値が現行の自己ベスト形式かを判定する。
 *
 * 手動編集や旧形式で壊れた値は記録なしとして扱い、ゲーム開始や結果表示を止めない。
 */
function isBestRecord(value: unknown): value is BestRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  /** 保存形式の唯一の必須値。正の有限数だけを有効なタイムとして扱う。 */
  const elapsedMs = (value as BestRecord).elapsedMs;
  return (
    typeof elapsedMs === "number" && Number.isFinite(elapsedMs) && elapsedMs > 0
  );
}

/**
 * 指定条件の自己ベストを読み出す。
 *
 * 実ストレージの例外処理と JSON の破損判定は共有 storage 層へ委譲し、
 * この層は keisan-game 固有のキーと型だけに責務を絞る。
 */
export function readBestRecord(
  operation: Operation,
  level: Level,
  target: TimeAttackTarget,
): BestRecord | null {
  return readJSON(bestRecordKey(operation, level, target), isBestRecord);
}

/**
 * タイムアタック終了時に UI へ返す記録更新結果。
 *
 * 結果画面はこの情報だけで「初回」「既存ベスト」「更新演出」を分岐できる。
 */
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
  /** 保存・更新に使う条件別キー。読み書きで同じキーを使うため先に固定する。 */
  const key = bestRecordKey(operation, level, target);
  /** 今回より前の有効な自己ベスト。壊れた値は storage 層で null へ落ちる。 */
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
