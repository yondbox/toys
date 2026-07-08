# UI Contract: けいさん れんしゅうゲーム

**Date**: 2026-07-08 | **Plan**: [../plan.md](../plan.md) | **Spec**: [../spec.md](../spec.md)

このおもちゃの外部インターフェースは「画面の観察可能な振る舞い」と「localStorage キー」。
E2E／コンポーネントテストの `data-testid` と契約を固定し、実装差し替えに強くする。

## 画面遷移（4 状態）

```
mode-select ──(演算・レベル選択後)──▶ practice: playing
     │
     └──(タイムアタック問題数選択)──▶ countdown ─▶ playing ⇄ feedback ─▶ result
                                                              └─(最終正解)─┘
result ──(もういちど)──▶ countdown        result ──(ホーム)──▶ mode-select
playing/feedback/countdown/result ──(もどる)──▶ mode-select
```

## ホーム（mode-select）

| 要素 | data-testid | 契約 |
|------|-------------|------|
| 演算カード | `op-add` `op-sub` `op-mul` `op-div` `op-mix` | 選択で `aria-pressed`。識別色・記号を表示（FR-001/014） |
| レベル | `level-easy` `level-normal` `level-hard` | 単一選択・`aria-pressed`（FR-002） |
| れんしゅう開始 | `mode-practice` | practice の playing へ（FR-015） |
| タイムアタック | `mode-10` `mode-30` `mode-50` | countdown へ。100 は無い（FR-017） |
| トップへ戻る | リンク | `/` へ（FR-034） |

- 最初の問題到達まで 3 操作以内（演算→レベル/モード→開始）（SC-002）。

## プレイ（playing / feedback）

| 要素 | data-testid | 契約 |
|------|-------------|------|
| 進捗（タイムアタックのみ） | `progress` | 残りがわかるバー。正解のみ加算（FR-019） |
| 経過時間（タイムアタックのみ） | `timer` | 0.1 秒表示。practice では非表示（FR-015/019） |
| 式 | `equation` | `a op b =`。演算記号を表示 |
| 答え欄（単一） | `answer` | 数字を大きく表示。最大桁数超過は無視（FR-010） |
| 答え欄（あまり算） | `answer-quotient` `answer-remainder` | 2 欄。選択中の欄へ入力（FR-006） |
| テンキー | `keypad` と `key-0`…`key-9` `key-backspace` `key-clear` `key-submit` | タッチで入力・確定。48px 四方以上（FR-007/008） |
| 正誤表示 | `feedback` | 正=〇/せいかい、誤=×/もういちど を一定時間（FR-011） |

- キーボード併用: 数字＝入力、Enter＝確定、Backspace＝1 文字削除、Escape＝全消去。ブラウザの
  標準ショートカット（Cmd/Ctrl 等）は妨げない（FR-009）。テンキーと同一の action に写像する。
- 不正解時は同じ問題のまま答えだけ空（FR-012）。正解時は直前と異なる次問題へ（FR-005/013）。

## 結果（result）

| 要素 | data-testid | 契約 |
|------|-------------|------|
| 今回タイム | `result-time` | `x.x びょう`（FR-020） |
| 自己ベスト | `result-best` | 従来ベスト。無ければ「はじめてのきろく」相当 |
| 更新演出 | `result-new-record` | 今回 < 従来のとき表示（FR-023） |
| もういちど | `retry` | 同条件で再挑戦（FR-024） |
| ホーム | `back-to-modes` | mode-select へ |

## 練習の成果（practice 終了）

| 要素 | data-testid | 契約 |
|------|-------------|------|
| 成果表示 | `practice-summary` | その回の正解数をねぎらう文言（0 もんでも破綻しない）（FR-016） |

## テーマ切替（アプリ全体・共有）

| 要素 | data-testid | 契約 |
|------|-------------|------|
| テーマトグル | `theme-toggle` | 全ルート（トップ＋全おもちゃ）に表示。押下で light⇄dark（FR-027/028） |

- 初回（`toys:theme` 未保存）は OS 設定に一致（FR-026）。手動選択は `toys:theme` に保存し、
  再訪・再読み込みで維持（FR-029）。誤配色の初回フラッシュを出さない（FR-030）。
- `<html data-theme>` を切替え、全ルートへ即時反映。進行中のゲーム状態は保持。

## localStorage 契約（FR-031/032）

- 書き込みキーは `toys:` 接頭辞のみ。`toys:theme`（共有）と
  `toys:keisan-game:best:{op}:{level}:{target}`（本おもちゃ）以外を書かない。
- 保存不能・破損値でもプレイ／テーマ表示は既定で継続。他おもちゃのキーを読み書き・上書きしない。

## レスポンシブ契約（FR-036/037・SC-010/011）

- 375×667（たて向き）で playing に縦スクロールが発生しない。テンキーは常に可視・最下部。
- 幅 375px 以上で全ルートに横スクロールが発生しない。
