import Link from "next/link";
import { toys } from "@/toys/registry";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          toys
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          小さな Web アプリのコレクション
        </p>
        {toys.length === 0 ? (
          <p className="mt-12 text-zinc-500 dark:text-zinc-500">
            おもちゃはまだありません。
          </p>
        ) : (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {toys.map((toy) => (
              <li key={toy.slug}>
                <Link
                  href={`/${toy.slug}`}
                  className="block h-full rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
                >
                  <h2 className="font-semibold text-black dark:text-zinc-50">
                    {toy.title}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {toy.description}
                  </p>
                  {toy.tags && toy.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {toy.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
