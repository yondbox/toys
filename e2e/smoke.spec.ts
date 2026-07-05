import { expect, test } from "@playwright/test";

test("トップの一覧から counter へ遷移して操作できる", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "toys" })).toBeVisible();

  await page.getByRole("link", { name: /カウンター/ }).click();
  await expect(page).toHaveURL(/\/counter$/);

  await page.getByRole("button", { name: "+1" }).click();
  await expect(page.getByRole("status")).toHaveText("1");

  await page.getByRole("button", { name: "リセット" }).click();
  await expect(page.getByRole("status")).toHaveText("0");
});
