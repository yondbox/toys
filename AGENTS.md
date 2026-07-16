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
- コメントとドキュメントコメントは「ドキュメントコメント（必須）」セクションの規約に従う。
- 仕様とタスクは技術レイヤーではなく、独立して検証可能な機能・ユーザー価値の
  垂直スライスで分割する。
- コミットは小さく頻繁に。1 コミット 1 関心事。
- コミットメッセージは Conventional Commits、scope におもちゃの slug。例: `feat(calculator): add square root button`。

## ドキュメントコメント（必須）

コードは人間と AI エージェントに引き継がれる前提で書く。引き継ぐ人の助けとなる
ドキュメントコメントを、コードと同時に必ず書く。

- クラス・関数・メソッド・React コンポーネント・カスタムフック・型・定数・設定値には、
  export の有無（public / private）を問わず **TSDoc 形式**のドキュメントコメントを必ず付ける。
- コメントには、コードを読めばわかることではなく次を書く。
  - **契約**: 型で表せない事前条件・単位・値域・フォーマット・失敗時の挙動
  - **意図**: なぜこの方針・値を選んだか。検討して却下した代替案
  - **根拠**: どの仕様・issue・外部制約に由来する判断か（出典を示す）
  - **罠**: 変更すると壊れやすい点・非自明な依存・順序の制約
- コードの逐語的な説明（what の言い換え）は書かない。「なぜ」が存在しない自明な宣言には
  契約だけを 1 行で書き、理由をでっち上げない。
- 実装と矛盾したコメントは、同じ変更の中で修正または削除する。
- 詳細な記述ルール・タグの使い分け・良い例と悪い例は `tsdoc-comments` Skill
  （`.claude/skills/tsdoc-comments/SKILL.md`）に従う。
- 実装を完了とする前に、変更したすべての宣言が上記を満たしているかセルフレビューする。

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
