"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/theme";
import { createParticleScene, type ParticleScene } from "./scene";

type ParticleCanvasProps = {
  onShapeChange: (label: string) => void;
  onUnsupported: () => void;
};

function readDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function readReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
