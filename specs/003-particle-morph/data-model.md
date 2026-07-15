# Data Model: particle-morph（パーティクル・モーフィング）

**Date**: 2026-07-15 | **Plan**: [plan.md](./plan.md)

保存データはない（Storage: なし）。ここでは実行時のドメインモデルと不変条件を定義する。
モジュール配置は [plan.md の Project Structure](./plan.md#project-structure) を参照。

## Shape（造形） — `shapes.ts`

粒子が集結して作る 1 つの形。

| フィールド | 型 | 説明 |
|-----------|----|------|
| `id` | `"sphere" \| "torusKnot" \| "galaxy" \| "wave" \| "text"` | 造形の識別子 |
| `label` | `string` | 画面表示名（例:「きゅうたい」）。ひらがな表記 |
| `generate` | `(count: number, seed: number) => Float32Array` | 粒子座標の生成関数 |

**不変条件**:

- `generate` は長さ `count * 3` の配列を返す（x, y, z の順で粒子ごとに連続）
- 同じ `count`・`seed` に対して常に同じ配列を返す（決定的。テスト可能性の根拠）
- すべての座標は共通のバウンディング半径内に収まる（カメラ固定でも造形が画面内に
  収まる根拠。FR-014）
- `text` 造形は Canvas 2D が利用できない環境ではフォールバックとして `sphere` と同じ
  配置規則で生成する（research.md R5）

## ShapeSequence（造形シーケンス） — `morph.ts`

造形の固定された循環順序。

| フィールド | 型 | 説明 |
|-----------|----|------|
| `shapes` | `readonly Shape[]` | `sphere → torusKnot → galaxy → wave → text` の固定順（FR-005） |
| `currentIndex` | `number` | 現在の造形の位置 |

**不変条件**: 次の造形は `(currentIndex + 1) % shapes.length`。末尾の次は先頭（循環）。

## MorphTransition（変形） — `morph.ts`

ある造形から次の造形への 1 回の遷移。

| フィールド | 型 | 説明 |
|-----------|----|------|
| `phase` | `"idle" \| "morphing"` | 待機中か変形中か |
| `startedAt` | `number` | 変形開始時刻（rAF タイムスタンプ基準） |
| `durationMs` | `number` | 変形の所要時間。1,000〜3,000ms の範囲の定数（SC-002） |
| `progress` | `number` | 全体進行度 0〜1。easing 済みの値をシェーダー uniform に渡す |

**粒子ごとの stagger**（シェーダー側と共有する規則）:

- 各粒子は生成時に遅延 `delay ∈ [0, DELAY_MAX]`（`DELAY_MAX = 0.4`）を持つ
- 粒子の実効進行度は `clamp((progress − delay) / (1 − DELAY_MAX), 0, 1)`

**不変条件**:

- `progress` は 0〜1 に単調増加でクランプされる（タブ復帰時も飛び越えない。research.md R9）
- `progress = 1` のとき、すべての粒子の実効進行度が 1（変形の取り残しが出ない）
- `phase = "morphing"` の間、新たな変形要求は無視する（FR-007）。変形完了で `idle` へ戻る

**状態遷移**:

```text
idle --(手動操作 / 自動変形判定)--> morphing --(progress が 1 到達)--> idle
        ※ morphing 中の変形要求は無視（状態を変えない）
```

## AutoAdvance（自動変形判定） — `morph.ts`

| フィールド | 型 | 説明 |
|-----------|----|------|
| `lastInteractionAt` | `number` | 最後のユーザー操作時刻 |
| `intervalMs` | `number` | 自動変形までの無操作時間。8,000ms の定数（FR-010） |

**不変条件**:

- 自動変形が発火する条件: `phase = "idle"` かつ `now − lastInteractionAt ≥ intervalMs`
- 手動変形・ポインタ操作・自動変形の発火自体が `lastInteractionAt` を更新する
  （直後に自動変形が重ならない。US3 受け入れシナリオ 2）
- reduced-motion 有効時は常に発火しない（FR-012）

## ThemePalette（配色パレット） — `palette.ts`

アプリ共通テーマ（`"light" | "dark"`、`src/lib/theme.ts` の `Theme` 型を参照）から解決する
本おもちゃの配色。

| フィールド | 型 | 説明 |
|-----------|----|------|
| `background` | `string`（hex） | 空間の背景色 |
| `colorInner` | `string`（hex） | 原点に近い粒子の色 |
| `colorOuter` | `string`(hex) | 外縁の粒子の色 |
| `blending` | `"additive" \| "normal"` | ダークは加算グロー、ライトは通常合成（research.md R4/R7） |

**不変条件**: `resolvePalette(theme)` は純関数。どちらのテーマでも粒子色と背景のコントラスト
が確保される（US4 受け入れシナリオ）。

## PointerState（ポインタ状態） — `scene.ts` 内部

| フィールド | 型 | 説明 |
|-----------|----|------|
| `world` | `{x, y, z}` | Z=0 平面へ投影したワールド座標（シェーダー uniform） |
| `active` | `boolean` | ポインタが画面内にあるか。false のとき反発強度を 0 へ滑らかに戻す |

反発は表示上の変位のみで、`aPositionFrom` / `aPositionTo` の基準位置を変更しない
（FR-008 の「元の配置へ戻る」を構造的に保証。research.md R6）。

## モジュール依存の向き

```text
page.tsx → ParticleCanvas.tsx → scene.ts → shaders.ts
                                    ↓
                shapes.ts / morph.ts / palette.ts（純関数層。three に依存しない）
                                    ↑
                          （src/lib/theme.ts の Theme 型のみ参照）
```

純関数層は three と DOM に依存しない（`shapes.ts` の Canvas 2D 利用のみ、注入または
フォールバックで隔離）。ユニットテストはこの層だけを対象にする（research.md R11）。
