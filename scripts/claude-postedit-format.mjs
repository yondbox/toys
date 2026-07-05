#!/usr/bin/env node
// Claude Code の PostToolUse hook。
// Edit/Write されたファイルに Biome の整形と safe fix を適用する。
// 整形対象外・整形エラーは無視するが、Biome 自体が無い場合は警告する。

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let filePath;
  try {
    filePath = JSON.parse(raw)?.tool_input?.file_path;
  } catch {
    process.exit(0);
  }
  if (!filePath || !fs.existsSync(filePath)) {
    process.exit(0);
  }
  try {
    execFileSync(
      "pnpm",
      [
        "exec",
        "biome",
        "check",
        "--write",
        "--no-errors-on-unmatched",
        "--files-ignore-unknown=true",
        filePath,
      ],
      { stdio: "ignore" },
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(
        "claude-postedit-format: pnpm が見つからないため自動整形をスキップしました",
      );
    }
    // 整形エラー（lint 違反等）は check-only ゲートに任せてブロックしない
  }
  process.exit(0);
});
