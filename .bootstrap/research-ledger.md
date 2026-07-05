# Research Ledger

調査日: 2026-07-05 / アクセス: オンライン（公式ドキュメント確認済み）

## 対象 = standard 品質レベルで不足している項目の公式手法

### 1. SECURITY.md（脆弱性報告方針）

- 出典: GitHub Docs「Adding a security policy to your repository」
  https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository
- 採用: リポジトリ直下（または `.github/`）に `SECURITY.md` を置く。サポート対象バージョンと報告手段を記載。
- portfolio かつ個人リポジトリのため、GitHub の Private vulnerability reporting（Security Advisories）経由の非公開報告を推奨。
- 理由: 公開 Issue での脆弱性開示を避ける導線を明示するのが標準。

### 2. CONTRIBUTING.md

- 出典: GitHub Docs「Setting up your project for healthy contributions」
- 採用: 開発コマンド（pnpm）と検証手順（lint/typecheck/test/build）、AGENTS.md への参照を記載。
- 理由: AGENTS.md がツール方針の正本のため、CONTRIBUTING は重複せず参照に留める（AI エージェント指示の冗長化を避ける方針に一致）。

### 3. .github/pull_request_template.md

- 出典: GitHub Docs「Creating a pull request template」
- 採用: Summary / Changes / Testing チェックリスト / Risk を含む軽量テンプレート。
- 理由: 既存 CI のチェック（lint/typecheck/test/build）と整合させる。

### 4. Dependabot auto-merge（minor + patch）

- 出典: GitHub Docs「Automating Dependabot with GitHub Actions」
  https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions
- 採用手法:
  - `dependabot/fetch-metadata` で update-type を取得（SHA ピン留め）。
  - `gh pr merge --auto` で minor + patch のみ auto-merge。
  - permissions: `contents: write`, `pull-requests: write`。
  - actor ガード: `github.event.pull_request.user.login == 'dependabot[bot]'`。
- 重要な前提（公式 NOTE）:
  - auto-merge が機能するには **リポジトリ設定で "Allow auto-merge" が有効**である必要。
  - **必須ステータスチェック（ブランチ保護）** が無いと即マージされうる。既存 CI をブランチ保護の必須チェックに設定することを推奨。
- 判定: この項目は **recommended**（standard の必須ではないが、ユーザーが minor+patch auto-merge を希望）。リポジトリ側設定（auto-merge 有効化・ブランチ保護）が前提のため required には含めない。

## 尊重すべき既存方針（AGENTS.md）

- pnpm のみ / Biome のみ。Prettier・ESLint・他パッケージマネージャは導入しない。
- registry / トップ一覧を手書きしない。既存おもちゃを無関係変更で書き換えない。

## 却下した選択肢

- Renovate: Dependabot が既に稼働中のため不採用（重複回避）。
- CodeQL / SAST: strict 向け。今回は standard のため optional に留める。
- 別途 format-check CI ステップ: `biome check`（= lint + format 検証）が既に CI にあるため不要。
