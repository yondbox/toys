export type Toy = {
  /** URL パス。kebab-case で src/app/(toys)/<slug>/ と一致させる */
  slug: string;
  title: string;
  description: string;
  tags?: string[];
  /** 追加日（YYYY-MM-DD） */
  createdAt: string;
};

export const toys: Toy[] = [
  {
    slug: "addition-game",
    title: "たしざんタイムアタック",
    description:
      "きほんは1桁・じょうきゅうは2桁の足し算を、フリーモードとタイムアタックで解くゲーム。",
    createdAt: "2026-07-07",
  },
  {
    slug: "counter",
    title: "カウンター",
    description: "ボタンで数を増減するだけの最小のおもちゃ。",
    tags: ["sample"],
    createdAt: "2026-07-02",
  },
];
