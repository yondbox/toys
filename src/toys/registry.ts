/**
 * トップページに表示するおもちゃの登録情報。
 *
 * ルート実装とは別に一覧用メタデータを集約し、トップページを手書き更新しなくてよいようにする。
 */
export type Toy = {
  /** URL パス。kebab-case で src/app/(toys)/<slug>/ と一致させる */
  slug: string;
  /** トップページに表示する短い名前。 */
  title: string;
  /** どんな遊びかを一覧で把握するための説明文。 */
  description: string;
  /** 一覧の補助分類。必要な toy だけが持つ任意項目。 */
  tags?: string[];
  /** 追加日（YYYY-MM-DD） */
  createdAt: string;
};

/**
 * 公開中のおもちゃ一覧。
 *
 * `pnpm new-toy <slug>` がここへ登録する前提にして、トップページの一覧生成元を1か所に保つ。
 */
export const toys: Toy[] = [
  {
    slug: "keisan-game",
    title: "けいさんゲーム",
    description:
      "たしざん・ひきざん・かけざん・わりざんを、レベル別のれんしゅうとタイムアタックであそべる計算ゲーム。",
    createdAt: "2026-07-08",
  },
  {
    slug: "counter",
    title: "カウンター",
    description: "ボタンで数を増減するだけの最小のおもちゃ。",
    tags: ["sample"],
    createdAt: "2026-07-02",
  },
];
