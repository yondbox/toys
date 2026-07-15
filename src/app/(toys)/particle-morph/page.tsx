"use client";

import Link from "next/link";
import { useState } from "react";
import { ParticleCanvas } from "./ParticleCanvas";

export default function ParticleMorphPage() {
  const [shapeLabel, setShapeLabel] = useState("きゅうたい");
  const [isUnsupported, setIsUnsupported] = useState(false);

  return (
    <div
      className="relative flex min-h-dvh flex-1 overflow-hidden bg-[#f3efe4] text-zinc-950 dark:bg-[#02030a] dark:text-zinc-50"
      data-testid="particle-morph-page"
    >
      {!isUnsupported && (
        <ParticleCanvas
          onShapeChange={setShapeLabel}
          onUnsupported={() => setIsUnsupported(true)}
        />
      )}

      <main className="pointer-events-none relative z-10 flex min-h-dvh w-full flex-col px-5 py-6 sm:px-8 sm:py-8">
        <div className="max-w-xl">
          <Link
            href="/"
            className="pointer-events-auto text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-cyan-100/75 dark:hover:text-cyan-50"
          >
            ← toys
          </Link>
          <h1 className="mt-5 max-w-[13rem] text-3xl font-black leading-tight sm:max-w-none sm:text-5xl">
            パーティクル・モーフィング
          </h1>
          <p
            aria-live="polite"
            className="mt-4 inline-flex text-2xl font-bold text-cyan-700 dark:text-cyan-200 sm:text-4xl"
          >
            {shapeLabel}
          </p>
        </div>

        <div className="flex flex-1 items-center">
          {isUnsupported && (
            <output className="max-w-md text-lg font-medium leading-8 text-zinc-700 dark:text-zinc-200">
              このブラウザでは 3D 表示を開始できませんでした。WebGL
              に対応したブラウザで開くと、粒子の変形を表示できます。
            </output>
          )}
        </div>

        {!isUnsupported && (
          <div className="mb-2 text-sm font-bold text-zinc-700 dark:text-cyan-50/80 sm:text-base">
            <p>クリックで へんしん</p>
          </div>
        )}
      </main>
    </div>
  );
}
