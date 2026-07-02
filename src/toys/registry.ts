export type Toy = {
  /** URL パス。kebab-case で src/app/(toys)/<slug>/ と一致させる */
  slug: string;
  title: string;
  description: string;
  tags?: string[];
  /** 追加日（YYYY-MM-DD） */
  createdAt: string;
};

export const toys: Toy[] = [];
