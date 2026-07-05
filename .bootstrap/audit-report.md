# Audit Report

実施日: 2026-07-05 / 品質レベル: standard / 目的: portfolio

## 総合判定: PASS（本番導入可能）

追加は全てドキュメント / 新規 workflow のみで、既存コード・ツールチェーンへの変更はゼロ。低リスク。

## Fit（適合性）

| 観点 | 判定 | 所見 |
| --- | --- | --- |
| 目的（portfolio）との適合 | ✅ | SECURITY/CONTRIBUTING/PR テンプレートは公開リポジトリの標準的な健全性ファイル |
| 品質レベル（standard）との適合 | ✅ | standard ベースラインの不足分（3 required）を過不足なく補完 |
| 過剰設定の有無 | ✅ 過剰なし | CodeQL/SAST・ADR は optional に留め未適用。standard を超えていない |
| デプロイリスクに対する不足 | ⚠️ 軽微 | auto-merge は有効化にリポジトリ側設定（後述）が必要 |

## Safety（安全性）

| 観点 | 判定 | 所見 |
| --- | --- | --- |
| secrets の回避 | ✅ | 実値の記載なし。`GITHUB_TOKEN` のみ参照。`.env` 不変更 |
| Actions 権限の最小化 | ✅ | auto-merge workflow は `contents: write` / `pull-requests: write` に限定（gh pr merge に必要な最小） |
| 第三者アクションの正当性 | ✅ | `dependabot/fetch-metadata`（GitHub 公式）を v3.1.0 で **SHA ピン留め**。既存 CI の方針と一致 |
| auto-merge の保守性 | ✅ | minor+patch のみ自動、major は人手。前提として必須チェックが必要な旨をコメント/ドキュメント化 |

## Maintainability（保守性）

| 観点 | 判定 | 所見 |
| --- | --- | --- |
| スクリプト/ドキュメントの整合 | ✅ | CONTRIBUTING・PR テンプレートのコマンドが `package.json` scripts と一致（lint/typecheck/test:unit/build/test:e2e） |
| CI の単純さ | ✅ | 既存 CI 未変更。auto-merge は独立 workflow で責務分離 |
| 新規ファイルの必要性 | ✅ | 各ファイルに明確な役割。冗長なし |
| 決定の記録 | ✅ | `.bootstrap/` に doctor〜verification、本 audit、decisions を保存 |

## AI Agent Quality

| 観点 | 判定 | 所見 |
| --- | --- | --- |
| AGENTS.md の簡潔さ | ✅ | 既存 AGENTS.md は簡潔。今回未変更 |
| 指示の重複 | ✅ | CONTRIBUTING は AGENTS.md を**参照**し重複を回避 |
| コマンドの正確性 | ✅ | 実在の scripts のみ記載 |
| 保護ファイルの明示 | ✅ | AGENTS.md に既存方針（registry 手書き禁止・他 toy 不変更）あり |
| skills/hooks の限定 | ✅ | 新規 hooks 追加なし。Lefthook 既存構成を維持 |

## Existing Project Preservation

| 観点 | 判定 | 所見 |
| --- | --- | --- |
| ジェネレータ既定の保持 | ✅ | create-next-app 構成を保持 |
| テンプレートの保持 | ✅ | 既存の AI 指示・VS Code 設定・CI を不変更 |
| 大規模移行の回避 | ✅ | pnpm/Biome 方針を尊重。移行なし |
| 大きな整形差分の回避 | ✅ | 既存ファイル無変更。整形差分ゼロ |

## Critical Issues

- なし。

## Recommended Fixes（適用前に対応）

1. **auto-merge の前提設定**（`docs/branch-protection.md` 記載）— リポジトリ Web UI で:
   - Settings > General > "Allow auto-merge" を有効化
   - `main` のブランチ保護で CI の `checks` / `e2e` を必須ステータスチェックに設定
   - 未設定だと CI 通過前にマージされうる（安全上の前提）。

## Optional Improvements（将来 / strict 化時）

- CodeQL/SAST（`.github/workflows/codeql.yml`）
- Vitest カバレッジ計測
- ADR ディレクトリ（現状は AGENTS.md に方針集約で代替）

## Final Readiness

- **required 3 件 + 承認済み recommended 2 件**: 導入可能。lint/typecheck/test/build 検証済み。
- 唯一の残タスクは auto-merge 前提のリポジトリ設定（コード外・Web UI）。
