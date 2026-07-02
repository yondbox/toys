import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CounterPage from "./page";

function getCount() {
  return screen.getByRole("status").textContent;
}

describe("counter", () => {
  it("初期値は 0", () => {
    render(<CounterPage />);
    expect(getCount()).toBe("0");
  });

  it("+1 / −1 で増減する", () => {
    render(<CounterPage />);
    fireEvent.click(screen.getByRole("button", { name: "+1" }));
    fireEvent.click(screen.getByRole("button", { name: "+1" }));
    expect(getCount()).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "−1" }));
    expect(getCount()).toBe("1");
  });

  it("リセットで 0 に戻る", () => {
    render(<CounterPage />);
    fireEvent.click(screen.getByRole("button", { name: "+1" }));
    fireEvent.click(screen.getByRole("button", { name: "リセット" }));
    expect(getCount()).toBe("0");
  });
});
