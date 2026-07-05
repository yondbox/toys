# Bootstrap Decisions

project-bootstrap-overlay 適用（2026-07-05）における主要な決定の記録。

---

## Decision 001: 品質レベルは standard を採用

### Context

リポジトリは PR #1 で既に高水準の開発ハーネス（Biome/Vitest/Playwright/Lefthook/commitlint/CI/Dependabot/.env.example）を導入済み。目的は portfolio。

### Options Considered

1. minimal
2. standard
3. strict

### Decision

standard。

### Reason

portfolio かつ個人リポジトリで、既に standard 相当が達成済み。不足は健全性ファイル（SECURITY/CONTRIBUTING/PR テンプレート）のみ。strict の CodeQL/ブランチ保護必須化/ADR は現段階では過剰。

### Rejected Options

- minimal: 既に超えているため後退になる。
- strict: 商用/チーム/長期向け。運用負荷に見合わない。

### Revisit When

商用化・チーム開発・外部貢献の本格受け入れ時。

---

## Decision 002: required は健全性ドキュメント 3 種のみ

### Context

standard ベースラインに対する不足を Doctor で特定。

### Options Considered

1. 健全性ファイル（SECURITY/CONTRIBUTING/PR テンプレート）のみ
2. + CodeQL・ブランチ保護 workflow も required 化

### Decision

健全性ファイル 3 種を required とする。

### Reason

低リスク・追加のみ・既存構成を壊さない。CI は `biome check`（lint+format 検証）を既に含むため追加ステップ不要。

### Rejected Options

- CodeQL 等の required 化: standard には過剰で optional が妥当。

### Revisit When

strict へ引き上げる場合。

---

## Decision 003: Dependabot auto-merge を minor+patch で採用（recommended）

### Context

ユーザー要望は minor+patch の auto-merge。Dependabot は稼働中。

### Options Considered

1. auto-merge なし（全て手動）
2. patch のみ
3. minor + patch（GitHub Actions + `gh pr merge --auto`）

### Decision

minor + patch を独立 workflow で自動マージ。major は人手レビュー。

### Reason

GitHub 公式手法（fetch-metadata → `gh pr merge --auto`）に準拠。権限は最小（contents/pull-requests write）。actor ガードと SHA ピン留めで安全性を確保。

### Rejected Options

- auto-merge なし: ユーザー要望に反する。
- patch のみ: 要望より保守的すぎる。
- major を含める: 破壊的変更リスクのため除外。

### Revisit When

依存更新による破損が頻発する場合は patch のみに縮小、または required チェックを追加。

---

## Decision 004: auto-merge の前提設定はコードに含めず文書化

### Context

`gh pr merge --auto` はリポジトリ設定（Allow auto-merge）とブランチ保護（必須チェック）が前提。これらは Web UI 設定でコード管理外。

### Options Considered

1. workflow のみ追加し前提を明記
2. 何もしない
3. API スクリプトで設定を自動化

### Decision

workflow を追加しつつ、前提を `docs/branch-protection.md` と workflow コメントに明記。

### Reason

リポジトリ設定はコードで冪等に管理しづらく、誤操作リスクがある。文書化して人手で有効化するのが安全。

### Rejected Options

- 自動化スクリプト: 権限・冪等性のリスク。overlay の「共有インフラを勝手に変えない」方針に反する。

### Revisit When

IaC（Terraform 等）でリポジトリ設定を管理する方針を採る場合。

---

## Decision 005: Renovate / 別フォーマッタ / ADR を採用しない

### Context

AGENTS.md が pnpm のみ・Biome のみを規定。Dependabot 稼働中。方針は AGENTS.md に集約済み。

### Options Considered

1. 既存方針を尊重（Dependabot/Biome 維持、ADR なし）
2. Renovate 導入 / Prettier 併用 / ADR ディレクトリ新設

### Decision

既存方針を尊重し追加ツールを入れない。ADR は optional に留める。

### Reason

重複回避と保守負荷低減。AGENTS.md が決定の正本として機能しており ADR の即時必要性は低い。

### Rejected Options

- Renovate: Dependabot と重複。
- Prettier/ESLint: AGENTS.md で明確に禁止。
- ADR 新設: 現状 AGENTS.md で代替可能。

### Revisit When

意思決定が複雑化し AGENTS.md だけでは追跡困難になった場合は ADR を導入。
