import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toys } from "./registry";

/**
 * toy ルートを置く App Router の route group ディレクトリ。
 *
 * registry と実ファイルの対応を検証するため、リポジトリルートからの絶対パスへ解決する。
 */
const toysDir = path.join(process.cwd(), "src", "app", "(toys)");

describe("toys registry", () => {
  it("slug は kebab-case である", () => {
    for (const toy of toys) {
      expect(toy.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("slug は重複しない", () => {
    const slugs = toys.map((toy) => toy.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("各 slug に対応するページが存在する", () => {
    for (const toy of toys) {
      const pagePath = path.join(toysDir, toy.slug, "page.tsx");
      expect(fs.existsSync(pagePath), `missing: ${pagePath}`).toBe(true);
    }
  });

  it("すべてのおもちゃページが registry に登録されている", () => {
    const slugs = new Set(toys.map((toy) => toy.slug));
    const dirs = fs
      .readdirSync(toysDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    for (const dir of dirs) {
      expect(slugs.has(dir), `unregistered: src/app/(toys)/${dir}`).toBe(true);
    }
  });

  it("createdAt は YYYY-MM-DD 形式である", () => {
    for (const toy of toys) {
      expect(toy.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
