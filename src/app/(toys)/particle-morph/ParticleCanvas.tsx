"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/theme";
import { createParticleScene, type ParticleScene } from "./scene";

/**
 * パーティクル canvas がページへ通知するイベント。
 */
type ParticleCanvasProps = {
  /** 現在造形のラベルが変わったときに呼ばれる。 */
  onShapeChange: (label: string) => void;
  /** WebGL 初期化に失敗したときに呼ばれる。 */
  onUnsupported: () => void;
};

/**
 * document に保存された現在テーマを読む。
 *
 * ThemeProvider と同じ `data-theme` を参照するため、React state を経由せず MutationObserver で同期する。
 *
 * @returns dark 以外は light として扱うテーマ値。
 */
function readDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * OS の reduced motion 設定を読む。
 *
 * @returns reduce が指定されている場合は true。
 */
function readReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * React と imperative な Three.js シーンを接続するホストコンポーネント。
 *
 * requestAnimationFrame は `ParticleScene` 側に閉じ込め、React は mount/unmount と外部設定変更だけを扱う。
 *
 * @param props - ページへ通知するラベル変更と非対応 fallback のコールバック。
 */
export function ParticleCanvas({
  onShapeChange,
  onUnsupported,
}: ParticleCanvasProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<ParticleScene | null>(null);
  const onShapeChangeRef = useRef(onShapeChange);
  const onUnsupportedRef = useRef(onUnsupported);

  useEffect(() => {
    onShapeChangeRef.current = onShapeChange;
    onUnsupportedRef.current = onUnsupported;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = createParticleScene({
      container,
      theme: readDocumentTheme(),
      reducedMotion: readReducedMotion(),
      onShapeChange: (label) => onShapeChangeRef.current(label),
    });

    if (!scene) {
      onUnsupportedRef.current();
      return;
    }

    sceneRef.current = scene;
    const observer = new MutationObserver(() => {
      scene.setTheme(readDocumentTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      scene.setReducedMotion(motionQuery.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      scene.morphToNext();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      observer.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <button
      type="button"
      ref={containerRef}
      aria-label="クリックで次の造形へ変形するパーティクル表示"
      className="absolute inset-0 cursor-pointer touch-manipulation appearance-none border-0 bg-transparent p-0"
      data-testid="particle-canvas-host"
      onClick={() => sceneRef.current?.morphToNext()}
      onPointerCancel={() => sceneRef.current?.leavePointer()}
      onPointerLeave={() => sceneRef.current?.leavePointer()}
      onPointerMove={(event) =>
        sceneRef.current?.movePointer(event.clientX, event.clientY)
      }
    />
  );
}
