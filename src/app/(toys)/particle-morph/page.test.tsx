import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ParticleMorphPage from "./page";

const particleCanvasMock = vi.hoisted(() => ({
  label: "きゅうたい",
  unsupported: false,
}));

vi.mock("./ParticleCanvas", async () => {
  const React = await import("react");
  return {
    ParticleCanvas: ({
      onShapeChange,
      onUnsupported,
    }: {
      onShapeChange: (label: string) => void;
      onUnsupported: () => void;
    }) => {
      React.useEffect(() => {
        onShapeChange(particleCanvasMock.label);
        if (particleCanvasMock.unsupported) {
          onUnsupported();
        }
      }, [onShapeChange, onUnsupported]);

      return <div data-testid="particle-canvas" />;
    },
  };
});

describe("ParticleMorphPage", () => {
  beforeEach(() => {
    particleCanvasMock.label = "きゅうたい";
    particleCanvasMock.unsupported = false;
  });

  it("renders the page skeleton and operation hint", () => {
    render(<ParticleMorphPage />);

    expect(
      screen.getByRole("heading", { name: "パーティクル・モーフィング" }),
    ).toBeTruthy();
    expect(screen.getByText("きゅうたい").getAttribute("aria-live")).toBe(
      "polite",
    );
    expect(screen.getByText("クリックで へんしん")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "← toys" }).getAttribute("href"),
    ).toBe("/");
    expect(screen.getByTestId("particle-canvas")).toBeTruthy();
  });

  it("shows the fallback message when WebGL is unavailable", async () => {
    particleCanvasMock.unsupported = true;

    render(<ParticleMorphPage />);

    expect((await screen.findByRole("status")).textContent).toContain(
      "このブラウザでは 3D 表示を開始できませんでした。",
    );
    await waitFor(() => {
      expect(screen.queryByTestId("particle-canvas")).toBeNull();
    });
  });
});
