#!/usr/bin/env node
// 新しいおもちゃの雛形を生成する。
// usage: pnpm new-toy <slug> [--title <title>] [--description <description>]

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const usage =
  'usage: pnpm new-toy <slug> [--title "<title>"] [--description "<description>"]';

function fail(message) {
  console.error(`error: ${message}`);
  console.error(usage);
  process.exit(1);
}

const args = process.argv.slice(2);
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

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pageDir = path.join(root, "src", "app", "(toys)", slug);
const pagePath = path.join(pageDir, "page.tsx");
const registryPath = path.join(root, "src", "toys", "registry.ts");

if (fs.existsSync(pageDir)) {
  fail(`既に存在します: src/app/(toys)/${slug}/`);
}

const registry = fs.readFileSync(registryPath, "utf8");
const arrayOpen = "export const toys: Toy[] = [";
if (!registry.includes(arrayOpen)) {
  fail(`registry の形式が想定外です: ${registryPath}`);
}
if (new RegExp(`slug:\\s*"${slug}"`).test(registry)) {
  fail(`registry に登録済みです: ${slug}`);
}

const now = new Date();
const createdAt = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-");

const componentName = `${slug
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join("")}Page`.replace(/^(\d)/, "Toy$1");

const pageSource = `"use client";

import Link from "next/link";

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
