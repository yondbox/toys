# AGENTS.md

本リポジトリで作業する AI エージェントが従う唯一の正本。

## 目的

小さな Web アプリ（"おもちゃ" = toy）を多数作成する。1 おもちゃ = 1 ページ完結を基本とし、追加しやすさを最優先する。

## アーキテクチャ

単一の Next.js アプリ内を Route Group で仕切る（モノレポにしない）。

- おもちゃは `src/app/(toys)/<slug>/` 配下のルートとして実装する。
- おもちゃ固有のコンポーネント・ロジック・型・スタイル・テストは、そのおもちゃの
  `src/app/(toys)/<slug>/` 配下にコロケーションする。
- 複数箇所で安定して共有するコードだけを `src/components/`・`src/lib/` に置く。
- おもちゃのメタデータは `src/toys/registry.ts` に集約し、トップページの一覧はそこから生成する（一覧を手書きしない）。

## スタック（固定）

- Next.js 16（App Router・Turbopack）/ React 19 + React Compiler
- TypeScript（strict）/ Tailwind CSS v4
- Lint・Format: **Biome のみ**
- パッケージ管理: **pnpm のみ**

## ルール

- パッケージ管理は pnpm のみ。`npm` / `yarn` / `bun` を使わない。依存追加は `pnpm add`。
- 整形・lint は Biome のみ。Prettier / ESLint を導入・提案しない。
- 新しいおもちゃは `pnpm new-toy <slug>`（`<slug>` は kebab-case）で雛形を生成する。`src/app/(toys)/<slug>/page.tsx` と `src/toys/registry.ts` への登録が自動で行われる。registry とトップの一覧を手で編集しない。
- 既存の他のおもちゃのコードを、無関係な変更で書き換えない。
- 実装は SOLID 原則と『リーダブルコード』の原則に従い、責務・名前・制御フローを
  人間が追跡しやすくする。不要な抽象化は追加しない。
- コメントは人間が理解できる表現で、コードだけでは伝わらない意図・制約・判断理由を
  説明する。コードの逐語的な説明や、実装と矛盾するコメントを残さない。
- 仕様とタスクは技術レイヤーではなく、独立して検証可能な機能・ユーザー価値の
  垂直スライスで分割する。
- コミットは小さく頻繁に。1 コミット 1 関心事。
- コミットメッセージは Conventional Commits、scope におもちゃの slug。例: `feat(calculator): add square root button`。

## コマンド

```bash
pnpm dev               # 開発サーバ
pnpm build             # 本番ビルド（追加・変更後の確認）
pnpm lint              # Biome チェック
pnpm format            # Biome 自動整形
pnpm typecheck         # 型チェック（tsc --noEmit）
pnpm test:unit         # ユニットテスト（Vitest）
pnpm test:e2e          # E2E テスト（Playwright・要 pnpm build）
pnpm new-toy <slug>    # 新しいおもちゃの雛形生成

```
