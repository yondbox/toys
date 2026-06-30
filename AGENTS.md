# AGENTS.md

本リポジトリで作業する AI エージェントが従う唯一の正本。

## 目的

小さな Web アプリ（"おもちゃ" = toy）を多数作成する。1 おもちゃ = 1 ページ完結を基本とし、追加しやすさを最優先する。

## アーキテクチャ

単一の Next.js アプリ内を Route Group で仕切る（モノレポにしない）。

- おもちゃは `src/app/(toys)/<slug>/` 配下のルートとして実装する。
- 共有コードは `src/components/`・`src/lib/` に置く。
- おもちゃのメタデータは `src/toys/registry.ts` に集約し、トップページの一覧はそこから生成する（一覧を手書きしない）。

## スタック（固定）

- Next.js 16（App Router・Turbopack）/ React 19 + React Compiler
- TypeScript（strict）/ Tailwind CSS v4
- Lint・Format: **Biome のみ**
- パッケージ管理: **pnpm のみ**

## ルール

- パッケージ管理は pnpm のみ。`npm` / `yarn` / `bun` を使わない。依存追加は `pnpm add`。
- 整形・lint は Biome のみ。Prettier / ESLint を導入・提案しない。
- 新しいおもちゃは `src/app/(toys)/<slug>/page.tsx`（`<slug>` は kebab-case）を作り、`src/toys/registry.ts` に登録する。トップの一覧は手で編集しない。
- 既存の他のおもちゃのコードを、無関係な変更で書き換えない。
- コミットは小さく頻繁に。1 コミット 1 関心事。
- コミットメッセージは Conventional Commits、scope におもちゃの slug。例: `feat(calculator): add square root button`。

## コマンド

```bash
pnpm dev               # 開発サーバ
pnpm build             # 本番ビルド（追加・変更後の確認）
pnpm lint              # Biome チェック
pnpm format            # Biome 自動整形
pnpm exec tsc --noEmit # 型チェック
```
