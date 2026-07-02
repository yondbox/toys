---
name: new-toy
description: 新しいおもちゃ（toy）を追加する。ユーザーが新しいおもちゃ・トイ・ミニアプリ・ページの追加や作成を依頼したときに使う。
---

# new-toy

新しいおもちゃを追加する標準手順。`AGENTS.md` の規約に従うこと。

## 手順

1. slug を決める（kebab-case・英小文字・数字・ハイフン）。既存の `src/app/(toys)/` と重複しないこと。
2. 雛形を生成する:

   ```bash
   pnpm new-toy <slug> --title "<タイトル>" --description "<一行説明>"
   ```

   `src/app/(toys)/<slug>/page.tsx` の作成と `src/toys/registry.ts` への登録が自動で行われる。registry を手で編集しない。

3. 生成された `page.tsx` におもちゃ本体を実装する。
   - 1 ページ完結。他のおもちゃのコードに触れない。
   - 共有したいコードが出た場合のみ `src/components/`・`src/lib/` へ。
4. 検証する: `pnpm lint` / `pnpm typecheck` / `pnpm build` がすべて成功すること。
   可能なら開発サーバで実際の動作も確認する。
5. コミットする: `feat(<slug>): <内容>`（Conventional Commits・日本語可）。

## 注意

- おもちゃを削除・リネームした場合は `.next/` に古いルート型が残り
  `pnpm typecheck` が失敗することがある。`pnpm build` で再生成される。
