import { getShape, type Shape, type ShapeId } from "./shapes";

/**
 * 自動・手動モーフィングで巡回する造形順。
 *
 * UI は「次へ」だけを公開するため、ここで順序を固定してテスト可能な状態遷移にしている。
 * 追加する場合は `SHAPES` に存在する `ShapeId` と一致させ、E2E のラベル巡回も更新すること。
 *
 * @see specs/003-particle-morph/spec.md
 */
export const SHAPE_SEQUENCE = [
  "sphere",
  "torusKnot",
  "galaxy",
  "wave",
  "text",
] as const satisfies readonly ShapeId[];

/**
 * 粒子ごとの遅延の最大値。
 *
 * シェーダ内の同名定数にも埋め込まれるため、変更時は CPU 側の `getParticleProgress` と
 * GPU 側の進行計算が同じ値を使うことを確認する。
 */
export const DELAY_MAX = 0.4;

/**
 * 1 回のモーフィングにかける時間（ミリ秒）。
 *
 * 粒子遅延とイージングを含めても、子ども向けのおもちゃとして変形を追える長さにしている。
 */
export const MORPH_DURATION_MS = 1800;

/**
 * 操作がないときに次の造形へ進むまでの待機時間（ミリ秒）。
 *
 * reduced motion では自動進行を止めるため、この値は通常モーション時だけ効く。
 */
export const AUTO_ADVANCE_INTERVAL_MS = 8000;

/**
 * 現在表示中の造形と、次に遷移する造形をまとめた巡回状態。
 */
export type ShapeSequence = {
  /** `SHAPE_SEQUENCE` 上の現在位置。負数や範囲外は生成時に正規化される。 */
  currentIndex: number;
  /** 画面上で現在完了状態として扱う造形。 */
  current: Shape;
  /** 次回のモーフィング先としてプレビューされる造形。 */
  next: Shape;
};

/**
 * モーフィングしていない安定状態。
 */
export type IdleTransition = {
  /** 進行中の遷移がないことを判別するタグ。 */
  phase: "idle";
  /** シェーダへ渡す進捗。idle では常に完了値。 */
  progress: 1;
};

/**
 * モーフィング中の時間ベース状態。
 */
export type MorphingTransition = {
  /** 進行中の遷移であることを判別するタグ。 */
  phase: "morphing";
  /** `performance.now()` と同じ時刻系の開始時刻（ミリ秒）。 */
  startedAt: number;
  /** 0 から 1 へ進むまでの所要時間（ミリ秒）。0 以下は指定しない。 */
  durationMs: number;
  /** イージング適用後の進捗。値域は 0 以上 1 以下。 */
  progress: number;
};

/**
 * 描画ループが扱うモーフィング状態。
 */
export type MorphTransition = IdleTransition | MorphingTransition;

/**
 * 手動または自動のモーフィング要求を受理できたかを返す結果。
 */
export type MorphRequestResult = {
  /** 既に遷移中の場合は false。呼び出し側は現在の遷移を維持する。 */
  accepted: boolean;
  /** 受理時は新しい遷移、拒否時は入力と同じ遷移。 */
  transition: MorphTransition;
};

/**
 * 自動進行の待機状態。
 */
export type AutoAdvance = {
  /** 最後のクリック・ポインタ移動・自動進行時刻。`performance.now()` 系のミリ秒。 */
  lastInteractionAt: number;
  /** 操作なしと判定するまでの時間（ミリ秒）。 */
  intervalMs: number;
};

/**
 * 自動進行判定と、次回判定に持ち越す状態。
 */
export type AutoAdvanceResult = {
  /** true のときだけ呼び出し側で次の造形へ進める。 */
  shouldAdvance: boolean;
  /** 進行した場合は `lastInteractionAt` が判定時刻へ更新される。 */
  autoAdvance: AutoAdvance;
};

/**
 * 任意のインデックスを `SHAPE_SEQUENCE` の範囲へ折り返す。
 *
 * @param index - 小数を許容し、切り捨ててから巡回範囲に正規化する。
 * @returns 0 以上 `SHAPE_SEQUENCE.length` 未満の整数。
 */
function normalizeIndex(index: number): number {
  const length = SHAPE_SEQUENCE.length;
  return ((Math.floor(index) % length) + length) % length;
}

/**
 * 巡回インデックスから造形定義を取得する。
 *
 * @param index - 範囲外や負数を許容する巡回インデックス。
 * @returns 対応する造形定義。
 */
function shapeAt(index: number): Shape {
  return getShape(SHAPE_SEQUENCE[normalizeIndex(index)]);
}

/**
 * シェーダへ渡す進捗値を 0 以上 1 以下へ制限する。
 *
 * @param value - 時刻差から計算された未制限の進捗。
 * @returns 0 以上 1 以下の値。
 */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * モーフィングを滑らかに開始・終了するための smoothstep イージング。
 *
 * @param progress - 0 以上 1 以下を想定する線形進捗。
 * @returns 0 以上 1 以下のイージング済み進捗。
 */
function easeInOut(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

/**
 * 現在位置から表示中・次回表示の造形ペアを作る。
 *
 * @param currentIndex - 巡回開始位置。範囲外や負数は正規化される。
 * @returns 現在造形と次造形を含む巡回状態。
 */
export function createShapeSequence(currentIndex = 0): ShapeSequence {
  const normalized = normalizeIndex(currentIndex);
  return {
    currentIndex: normalized,
    current: shapeAt(normalized),
    next: shapeAt(normalized + 1),
  };
}

/**
 * 造形巡回を 1 つ進める。
 *
 * @param sequence - 現在の巡回状態。
 * @returns 次の造形を現在造形として持つ新しい状態。
 */
export function advanceShapeSequence(sequence: ShapeSequence): ShapeSequence {
  return createShapeSequence(sequence.currentIndex + 1);
}

/**
 * シーン初期化時とモーフィング完了時の idle 状態を作る。
 *
 * @returns 完了進捗を持つ idle 状態。
 */
export function createIdleTransition(): IdleTransition {
  return {
    phase: "idle",
    progress: 1,
  };
}

/**
 * 新しいモーフィング遷移を開始する。
 *
 * @param startedAt - `performance.now()` と同じ時刻系の開始時刻（ミリ秒）。
 * @param durationMs - 遷移時間（ミリ秒）。省略時は `MORPH_DURATION_MS`。
 * @returns 進捗 0 のモーフィング状態。
 */
export function createMorphTransition(
  startedAt: number,
  durationMs = MORPH_DURATION_MS,
): MorphingTransition {
  return {
    phase: "morphing",
    startedAt,
    durationMs,
    progress: 0,
  };
}

/**
 * 現在時刻からモーフィングのイージング済み進捗を計算する。
 *
 * @param transition - 進行中のモーフィング状態。
 * @param now - `startedAt` と同じ時刻系の現在時刻（ミリ秒）。
 * @returns 0 以上 1 以下の進捗。終了後は 1 に張り付く。
 */
export function getEasedMorphProgress(
  transition: MorphingTransition,
  now: number,
): number {
  const linear = clamp01((now - transition.startedAt) / transition.durationMs);
  return easeInOut(linear);
}

/**
 * 個々の粒子遅延を加味した局所進捗を計算する。
 *
 * CPU テストでシェーダと同じ進捗契約を検証できるよう、GPU 側の式と同じ制約を保つ。
 *
 * @param progress - 全体のモーフィング進捗。値域は 0 以上 1 以下を想定する。
 * @param delay - 粒子ごとの開始遅延。`DELAY_MAX` を超える値は丸める。
 * @returns 遅延後の局所進捗。値域は 0 以上 1 以下。
 */
export function getParticleProgress(progress: number, delay: number): number {
  const safeDelay = Math.min(DELAY_MAX, Math.max(0, delay));
  return clamp01((progress - safeDelay) / (1 - DELAY_MAX));
}

/**
 * 現在の遷移状態に対してモーフィング開始要求を評価する。
 *
 * @param transition - 要求時点の遷移状態。遷移中は多重開始を拒否する。
 * @param now - 新しい遷移を開始する時刻（ミリ秒）。
 * @returns 要求の受理可否と、次に保持すべき遷移状態。
 */
export function requestMorph(
  transition: MorphTransition,
  now: number,
): MorphRequestResult {
  if (transition.phase === "morphing") {
    return {
      accepted: false,
      transition,
    };
  }

  return {
    accepted: true,
    transition: createMorphTransition(now),
  };
}

/**
 * 時刻に合わせてモーフィング状態を進める。
 *
 * @param transition - 現在の遷移状態。idle の場合は同じオブジェクトを返す。
 * @param now - `startedAt` と同じ時刻系の現在時刻（ミリ秒）。
 * @returns 完了時は idle、それ以外は進捗を更新した状態。
 */
export function updateMorphTransition(
  transition: MorphTransition,
  now: number,
): MorphTransition {
  if (transition.phase === "idle") {
    return transition;
  }

  const progress = getEasedMorphProgress(transition, now);
  if (progress >= 1) {
    return createIdleTransition();
  }

  return {
    ...transition,
    progress,
  };
}

/**
 * 自動進行の初期状態を作る。
 *
 * @param lastInteractionAt - 起点にする操作時刻（ミリ秒）。
 * @param intervalMs - 自動進行までの待機時間（ミリ秒）。省略時は `AUTO_ADVANCE_INTERVAL_MS`。
 * @returns 自動進行判定に使う状態。
 */
export function createAutoAdvance(
  lastInteractionAt: number,
  intervalMs = AUTO_ADVANCE_INTERVAL_MS,
): AutoAdvance {
  return {
    lastInteractionAt,
    intervalMs,
  };
}

/**
 * ユーザー操作または自動進行を待機時間の起点として記録する。
 *
 * @param autoAdvance - 更新前の自動進行状態。
 * @param now - 新しい起点時刻（ミリ秒）。
 * @returns `lastInteractionAt` だけを更新した状態。
 */
export function recordInteraction(
  autoAdvance: AutoAdvance,
  now: number,
): AutoAdvance {
  return {
    ...autoAdvance,
    lastInteractionAt: now,
  };
}

/**
 * 現在の時刻と遷移状態から、自動で次へ進むべきか判定する。
 *
 * reduced motion では予期しない動きを避けるため自動進行を止める。遷移中も多重開始を避ける。
 *
 * @param autoAdvance - 前回の操作時刻と待機時間。
 * @param transition - 現在のモーフィング状態。
 * @param now - 判定時刻（ミリ秒）。
 * @param reducedMotion - true の場合は自動進行しない。
 * @returns 進行可否と、次回判定に持ち越す状態。
 */
export function evaluateAutoAdvance(
  autoAdvance: AutoAdvance,
  transition: MorphTransition,
  now: number,
  reducedMotion = false,
): AutoAdvanceResult {
  if (
    reducedMotion ||
    transition.phase !== "idle" ||
    now - autoAdvance.lastInteractionAt < autoAdvance.intervalMs
  ) {
    return {
      shouldAdvance: false,
      autoAdvance,
    };
  }

  return {
    shouldAdvance: true,
    autoAdvance: recordInteraction(autoAdvance, now),
  };
}
