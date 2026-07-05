# Contributing

開発・ツールの方針はリポジトリ直下の [`AGENTS.md`](AGENTS.md) が正本です。本ドキュメントはその補助です。

## セットアップ

- Node.js 24 系（`.node-version` 参照）
- パッケージ管理は **pnpm のみ**（`npm` / `yarn` / `bun` は使わない）

```bash
pnpm install
pnpm dev            # 開発サーバ
```

## 新しいおもちゃの追加

雛形生成コマンドを使い、`registry` とトップ一覧は手で編集しないでください。

```bash
pnpm new-toy <slug>   # <slug> は kebab-case
```

## プルリクエスト前の検証

PR を出す前に以下をすべて通してください（CI と同一）。

```bash
pnpm lint            # Biome チェック（lint + format 検証）
pnpm typecheck       # tsc --noEmit
pnpm test:unit       # Vitest
pnpm build           # 本番ビルド
pnpm test:e2e        # Playwright（要 pnpm build）
```

## プルリクエスト

- PR は小さく、関心事を 1 つに絞ってください。
- コミットは [Conventional Commits](https://www.conventionalcommits.org/)。scope におもちゃの slug を付けます（例: `feat(calculator): add square root button`）。
- 既存の他のおもちゃのコードを、無関係な変更で書き換えないでください。

## AI 支援による変更

AI が生成した変更も [`AGENTS.md`](AGENTS.md) に従い、人手の変更と同じチェックを通す必要があります。
