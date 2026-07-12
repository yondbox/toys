# Data Model: けいさん れんしゅうゲーム（四則演算への再構成）

**Date**: 2026-07-08 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

セッション状態はメモリ内（reducer）。永続化するのは「自己ベスト記録」と「テーマ設定」のみで、
名前空間付き localStorage に保存する。ゲーム規則は `src/app/(toys)/keisan-game/game.ts` と
`operations.ts`、記録は `records.ts`、共有基盤は `src/lib/theme.ts`・`src/lib/storage.ts`。

## エンティティ

### Operation（演算）

| 値 | 記号 | 表示名 | 識別色の役割 |
|------|------|--------|--------------|
| `add` | ＋ | たしざん | オレンジ系 |
| `sub` | − | ひきざん | ブルー系 |
| `mul` | × | かけざん | グリーン系 |
| `div` | ÷ | わりざん | パープル系 |
| `mix` | ＋−×÷ | ミックス | アンバー系 |

- 由来: FR-001, FR-014。識別色・記号はホーム／プレイ／結果で一貫させる。
- `mix` は出題時に `add|sub|mul|div` のいずれかへ実体化する。

### Level（レベル）

| 値 | 表示名 | 星 |
|--------|----------|----|
| `easy` | やさしい | ★ |
| `normal` | ふつう | ★★ |
| `hard` | むずかしい | ★★★ |

- 由来: FR-002。演算ごとの出題範囲と答えの最大桁数を規定する（下表）。

### 出題範囲（Operation × Level）— FR-003 / FR-004

| 演算＼レベル | easy | normal | hard |
|---|---|---|---|
| add | 1桁＋1桁 | 繰り上がりあり・答え≤20 | 2桁＋2桁 |
| sub | 1桁−1桁（答え≥0） | 繰り下がりあり・答え≤20 | 2桁−2桁（答え≥0） |
| mul | 九九（1〜9 の段） | 2桁×1桁 | 2桁×2桁 |
| div | 九九の逆（割り切れる） | 2桁÷1桁（割り切れる） | あまりのあるわり算 |
| mix | 上記 easy 相当の4演算 | 上記 normal 相当 | 上記 hard 相当 |

- 不変条件: sub は `answer ≥ 0`。div は hard 以外 `remainder = 0`、除数 `> 0`（0 除算禁止）。

### Problem（問題）

```
Problem = {
  op: "add" | "sub" | "mul" | "div"   // mix は出題時に実体化（この4種のいずれか）
  a: number
  b: number
  answer:
    | { kind: "single"; value: number }              // ＋−×÷（割り切れる）
    | { kind: "quotient-remainder"; quotient: number; remainder: number }  // あまりのあるわり算
}
```

- 由来: FR-003, FR-006。`answer.kind` が入力欄の数（1 欄／2 欄）を決める。
- 判定: `single` は入力値 == value。`quotient-remainder` は商・あまりの両方一致で正解。

### AnswerInput（入力中の答え）

- `single`: 数字のみの文字列 1 つ。最大桁数は演算・レベル依存（FR-010）。
- `quotient-remainder`: `{ quotient: string; remainder: string; focus: "quotient" | "remainder" }`。
  テンキー入力は `focus` の欄へ反映（FR-006）。両欄非空で判定可能。

### GameMode（ゲームモード）

- `practice` — タイマー・進捗を持たない。任意終了で成果（正解数）を表示（FR-015/016）。
- `timeAttack` — 目標問題数 `target ∈ {10, 30, 50}` を持つ（FR-017）。

### SessionState（セッション状態・メモリ内）

画面 4 状態を持つ判別可能ユニオン（001 の設計を踏襲・拡張）:

- `mode-select` — ホーム。`operation`・`level`・モードを選ぶ。
- `countdown` — タイムアタック開始前の 3・2・1（FR-018）。
- `playing` — `operation, level, mode, problem, answerInput, solved, lastSolved, startedAt`。
- `feedback` — `result: "correct" | "wrong"`, `finishedAt`（最終正解時刻・FR-020）を持つ。
- `result` — `operation, level, target, elapsedMs, best`（比較用の従来ベスト）。

- 遷移・計測（カウントダウン終了から計測開始、最終正解の瞬間で確定、不正解は同問再挑戦、
  正解した問題のみ加算）は 001 の良好な仕様を踏襲（FR-012/013/019/020）。

### BestRecord（自己ベスト記録・永続化）

```
key   = `toys:keisan-game:best:${op}:${level}:${target}`   // op ∈ add|sub|mul|div|mix
value = { elapsedMs: number }   // その組の最短所要時間
```

- 由来: FR-021/022/023/025。組ごとに独立。今回 < 保存値で更新し「あたらしいきろく」演出（FR-023）。
- 破損・未保存時は「記録なし」として扱い、初回タイムを保存（FR-032）。

### ThemePreference（テーマ設定・永続化・アプリ共有）

```
key   = `toys:theme`
value = "light" | "dark"        // 未保存 = OS 設定に追従（system）
```

- 由来: FR-026〜029。アプリ全体で単一。未保存時はブート script が `matchMedia` で初期化。
- `<html data-theme="light|dark">` を駆動し、Tailwind の属性ベース `dark:` 変種を解決する。

## localStorage キー一覧（名前空間分離・FR-031）

| キー | 所有 | 内容 |
|------|------|------|
| `toys:theme` | 共有（アプリ全体） | 手動テーマ選択 |
| `toys:keisan-game:best:{op}:{level}:{target}` | keisan-game | 演算×レベル×問題数の最短タイム |

- すべて `toys:` 接頭辞。他のおもちゃ（例 `counter`）が `toys:counter:*` を使っても衝突しない。
- 読み書きは `src/lib/storage.ts` 経由に限定し、失敗・破損は既定へフォールバック（FR-032）。
