import type { NextConfig } from "next";

/**
 * Next.js アプリ全体の設定。
 *
 * React Compiler を有効化しているため、不要な `useMemo` / `useCallback` を増やさない方針と合わせて扱う。
 */
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
