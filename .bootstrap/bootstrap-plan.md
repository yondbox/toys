# Bootstrap Plan

## Detected Project

- Project type: Web アプリ（1 Next.js アプリ内に複数の "toy" を Route Group で集約）
- Language: TypeScript (strict)
- Framework: Next.js 16.2.9（App Router / Turbopack）
- Runtime: Node.js >= 24
- Package manager: pnpm 10.34.4（固定）
- Linter: Biome
- Formatter: Biome
- Type checker: tsc --noEmit
- Test runner: Vitest（unit）+ Playwright（e2e）
- CI: GitHub Actions（checks + e2e、SHA ピン留め、`contents: read`）
- Deployment: Vercel（推定）
- Security setup: `.env*` gitignore + `.env.example`、Dependabot（npm + actions）
- AI instruction files: AGENTS.md（正本）, CLAUDE.md, .github/copilot-instructions.md, .claude/skills/new-toy

## User Intent

- Purpose: portfolio
- Quality level: standard
- Stability preference: latest
- Deployment target: Vercel
- AI automation level: apply after approval
- Auto-merge policy: minor and patch
- Preserve existing template: yes

## Required Changes

standard ベースラインの安全性のために必要な最小差分。既存ハーネスとは重複しない項目のみ。

- [ ] `SECURITY.md` を追加（脆弱性の非公開報告方針・secrets 方針・依存更新方針）
- [ ] `CONTRIBUTING.md` を追加（pnpm 開発手順・検証コマンド・AGENTS.md 参照）
- [ ] `.github/pull_request_template.md` を追加（既存 CI チェックと整合した軽量テンプレート）

## Recommended Changes

価値はあるが即時必須ではない。リポジトリ側設定が前提。

- [ ] `.github/workflows/dependabot-auto-merge.yml` を追加（minor + patch を `gh pr merge --auto`）
  - 前提: GitHub リポジトリ設定で "Allow auto-merge" を有効化 + 既存 CI をブランチ保護の必須チェックに設定
- [ ] ブランチ保護 / ルールセットのドキュメント化（必須ステータスチェック = CI の checks/e2e）

## Optional Changes

将来 / strict 化する場合に有用。

- [ ] CodeQL / SAST ワークフロー（`.github/workflows/codeql.yml`）
- [ ] ADR ディレクトリ（`docs/adr/`）— 現状 AGENTS.md に方針集約済みのため任意
- [ ] カバレッジ計測（Vitest coverage）

## Risks

- 低リスク: 追加はドキュメント / 新規 workflow のみ。既存コード・ツールチェーンは変更しない。
- auto-merge workflow はリポジトリ側設定（auto-merge 有効・ブランチ保護）が無いと期待通り動かない → recommended に分類し、required では適用しない。

## Files to Create or Modify

| Path | Action | Risk | Category | Reason |
|---|---|---|---|---|
| SECURITY.md | create | low | required | 脆弱性報告方針の明示 |
| CONTRIBUTING.md | create | low | required | 開発・検証手順の明示（AGENTS.md 参照） |
| .github/pull_request_template.md | create | low | required | PR 品質の標準化（CI チェックと整合） |
| .github/workflows/dependabot-auto-merge.yml | create | medium | recommended | minor+patch 自動マージ（要リポジトリ設定） |
| docs/branch-protection.md | create | low | recommended | 必須チェック / 保護方針の記録 |
| .github/workflows/codeql.yml | create | low | optional | SAST（strict 化時） |

## Approval

このプランが承認されるまでファイルは変更しません。
承認後は **required のみ** を適用し、lint / typecheck / test / build を検証します。
recommended / optional は別途指示があった場合に適用します。
