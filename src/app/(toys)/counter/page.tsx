"use client";

import Link from "next/link";
import { useState } from "react";

export default function CounterPage() {
  const [count, setCount] = useState(0);

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
          カウンター
        </h1>
        <div className="mt-16 flex flex-col items-center gap-8">
          <output className="text-7xl font-semibold tabular-nums text-black dark:text-zinc-50">
            {count}
          </output>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCount((c) => c - 1)}
              className="h-12 w-24 rounded-full border border-zinc-300 text-xl transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              −1
            </button>
            <button
              type="button"
              onClick={() => setCount((c) => c + 1)}
              className="h-12 w-24 rounded-full bg-black text-xl text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
            >
              +1
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCount(0)}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          >
            リセット
          </button>
        </div>
      </main>
    </div>
  );
}
