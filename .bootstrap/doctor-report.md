# Doctor Report

生成日: 2026-07-05
ブランチ: `chore/dev-harness-setup`（PR #1「開発ハーネス一式の導入」進行中）

## 検出したスタック

| 項目 | 検出結果 | 根拠 |
| --- | --- | --- |
| プロジェクト種別 | Web アプリ（複数の小さな "toy" を 1 Next.js アプリ内に集約） | `AGENTS.md`, `src/app/(toys)/` |
| 言語 | TypeScript（strict） | `tsconfig.json`, `package.json` |
| フレームワーク | Next.js 16.2.9（App Router / Turbopack） | `package.json`, `next.config.ts` |
| UI | React 19.2.4 + React Compiler | `next.config.ts` (`reactCompiler: true`), `babel-plugin-react-compiler` |
| スタイル | Tailwind CSS v4 | `postcss.config.mjs`, deps |
| ランタイム | Node.js >= 24 | `package.json` engines, `.node-version` |
| パッケージ管理 | pnpm 10.34.4（固定） | `packageManager`, `pnpm-lock.yaml` |

## 既存の品質・開発環境

| カテゴリ | 状態 | 詳細 |
| --- | --- | --- |
| フォーマッタ | ✅ Biome | `biome format` / `biome check`（lint+format） |
| リンタ | ✅ Biome（next/react ドメイン有効） | `biome.json` |
| 型チェック | ✅ `tsc --noEmit` | `pnpm typecheck` |
| ユニットテスト | ✅ Vitest + Testing Library + jsdom | `vitest.config.mts`, `pnpm test:unit` |
| E2E テスト | ✅ Playwright | `playwright.config.ts`, `e2e/smoke.spec.ts` |
| Git hooks | ✅ Lefthook | pre-commit=biome check / commit-msg=commitlint / pre-push=typecheck+unit |
| コミット規約 | ✅ commitlint（Conventional Commits） | `commitlint.config.mjs` |
| CI | ✅ GitHub Actions（checks + e2e、SHA ピン留め、`permissions: contents: read`） | `.github/workflows/ci.yml` |
| 依存更新 | ✅ Dependabot（npm + github-actions、weekly、minor/patch グループ化） | `.github/dependabot.yml` |
| 環境変数 | ✅ `.env.example`（`NEXT_PUBLIC_SITE_URL`）、`.env*` は gitignore 済み | `.env.example`, `.gitignore` |
| エディタ設定 | ✅ `.vscode/`（extensions/launch/settings） | `.vscode/` |
| AI 指示 | ✅ `AGENTS.md`（正本）, `CLAUDE.md`, `.github/copilot-instructions.md`, `.claude/skills/new-toy` | ルート |

## ベースラインとして不足している項目

- `SECURITY.md`（脆弱性報告方針）— 未整備
- `CONTRIBUTING.md`（貢献・開発手順）— 未整備
- `.github/pull_request_template.md`（PR テンプレート）— 未整備
- CodeQL / SAST ワークフロー — 未整備（strict 品質レベルの場合のみ）
- ブランチ保護 / 必須ステータスチェックのドキュメント化 — 未整備
- ADR（アーキテクチャ決定記録）— 未整備（AGENTS.md に方針は集約済み）

## リスク領域

- 大部分が PR #1 のスコープと重複。既存のハーネスを壊さないこと。
- `AGENTS.md` が強い制約（pnpm のみ / Biome のみ / Prettier・ESLint 禁止）を規定。これを尊重する必要あり。
- CI は Node 24 前提。ローカルは `.node-version=24` で一致。

## 推定ジェネレータ / テンプレート

- `create-next-app`（TypeScript + Tailwind + App Router）ベース。
- その上に手動で開発ハーネスを重ねた状態（PR #1）。

## 人間の判断が必要な残課題（→ Grill へ）

- 目標品質レベル（standard か strict か）
- AI エージェントの自動化許容度
- Dependabot の auto-merge 方針
- デプロイ先の確定（Vercel と推定）
