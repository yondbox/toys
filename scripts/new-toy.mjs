#!/usr/bin/env node
// 新しいおもちゃの雛形を生成する。
// usage: pnpm new-toy <slug> [--title <title>] [--description <description>]

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/**
 * CLI の使い方。
 *
 * エラー時に同じ文言を出すため、`fail` から参照する単一の文字列として保持する。
 */
const usage =
  'usage: pnpm new-toy <slug> [--title "<title>"] [--description "<description>"]';

/**
 * エラーメッセージと usage を出力してプロセスを終了する。
 *
 * @param message - ユーザーに表示する失敗理由。
 */
function fail(message) {
  console.error(`error: ${message}`);
  console.error(usage);
  process.exit(1);
}

/** CLI 引数から `node` とスクリプトパスを除いた値。 */
const args = process.argv.slice(2);

/**
 * 生成対象のおもちゃ slug。
 *
 * route segment と commit scope にも使うため、kebab-case のみ許可する。
 */
const slug = args[0];
if (!slug || slug.startsWith("--")) {
  fail("slug を指定してください");
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  fail(
    `slug は kebab-case（英小文字・数字・ハイフン）で指定してください: ${slug}`,
  );
}

let title = slug;
let description = "";
for (let i = 1; i < args.length; i++) {
  const value = args[i + 1];
  if (args[i] === "--title" && value !== undefined) {
    title = value;
    i++;
  } else if (args[i] === "--description" && value !== undefined) {
    description = value;
    i++;
  } else {
    fail(`不明なオプション: ${args[i]}`);
  }
}

/** リポジトリルート。スクリプトの配置から相対的に解決する。 */
const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** 生成する toy ページのディレクトリ。 */
const pageDir = path.join(root, "src", "app", "(toys)", slug);

/** 生成する App Router ページファイル。 */
const pagePath = path.join(pageDir, "page.tsx");

/** toy 一覧の正本である registry ファイル。 */
const registryPath = path.join(root, "src", "toys", "registry.ts");

if (fs.existsSync(pageDir)) {
  fail(`既に存在します: src/app/(toys)/${slug}/`);
}

/** 既存 registry の内容。形式を検査してから先頭へ entry を挿入する。 */
const registry = fs.readFileSync(registryPath, "utf8");

/**
 * registry の toy 配列開始行。
 *
 * 文字列置換で挿入するため、registry の構造を変える場合はこの sentinel も更新する。
 */
const arrayOpen = "export const toys: Toy[] = [";
if (!registry.includes(arrayOpen)) {
  fail(`registry の形式が想定外です: ${registryPath}`);
}
if (new RegExp(`slug:\\s*"${slug}"`).test(registry)) {
  fail(`registry に登録済みです: ${slug}`);
}

/** createdAt をローカル日付で生成するための現在時刻。 */
const now = new Date();

/**
 * registry に保存する作成日。
 *
 * `registry.test.ts` が検証する `YYYY-MM-DD` 形式に合わせる。
 */
const createdAt = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-");

/**
 * 生成ページの React コンポーネント名。
 *
 * 数字始まりの slug は TypeScript の識別子にできないため `Toy` を前置する。
 */
const componentName = `${slug
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join("")}Page`.replace(/^(\d)/, "Toy$1");

/**
 * 新しい toy ページの雛形ソース。
 *
 * AGENTS.md の TSDoc ルールに合わせ、生成直後のコンポーネントにもコメントを含める。
 */
const pageSource = `"use client";

import Link from "next/link";

/**
 * 新しいおもちゃページの雛形。
 *
 * 実装時はこのコメントを、ページ固有の責務と入力・状態の契約に合わせて更新する。
 */
export default function ${componentName}() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
        >
          ← toys
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {${JSON.stringify(title)}}
        </h1>
        <div className="mt-16">
          <p className="text-zinc-500">ここに実装する。</p>
        </div>
      </main>
    </div>
  );
}
`;

/**
 * registry の先頭へ追加する toy メタデータ。
 *
 * トップページは registry から一覧を生成するため、ページ作成と同じ操作で必ず追加する。
 */
const entry = [
  "  {",
  `    slug: ${JSON.stringify(slug)},`,
  `    title: ${JSON.stringify(title)},`,
  `    description: ${JSON.stringify(description)},`,
  `    createdAt: ${JSON.stringify(createdAt)},`,
  "  },",
].join("\n");

fs.mkdirSync(pageDir, { recursive: true });
fs.writeFileSync(pagePath, pageSource);
fs.writeFileSync(
  registryPath,
  registry.replace(arrayOpen, `${arrayOpen}\n${entry}`),
);

console.log(`created: src/app/(toys)/${slug}/page.tsx`);
console.log(`updated: src/toys/registry.ts（${slug} を先頭に追加）`);
console.log("");
console.log("next steps:");
console.log(`  1. src/app/(toys)/${slug}/page.tsx を実装する`);
console.log("  2. pnpm lint && pnpm typecheck && pnpm build で確認する");
console.log(`  3. feat(${slug}): ... でコミットする`);
