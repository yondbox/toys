# toys

小さな Web アプリ（おもちゃ）を、1 ページ単位で追加できる Next.js アプリです。

## セットアップ

Node.js 24 以上と pnpm を使用します。

```bash
pnpm install
pnpm dev
```

開発サーバーは <http://localhost:3000> で確認できます。

## 新しいおもちゃを追加する

slug は kebab-case で指定します。生成コマンドがページの雛形を作り、registry に登録します。

```bash
pnpm new-toy <slug>
```

おもちゃ固有のコンポーネント、ロジック、型、スタイル、テストは
`src/app/(toys)/<slug>/` にコロケーションします。registry とトップページの一覧は手で編集しません。

## 検証

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e
```

詳細な作業規約は [AGENTS.md](AGENTS.md)、Spec Kit の設計原則は
[constitution.md](.specify/memory/constitution.md) を参照してください。
