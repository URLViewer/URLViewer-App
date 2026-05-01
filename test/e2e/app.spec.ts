import { expect, test } from "@playwright/test";

test("URL入力から動画リスト追加まで", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("URL ビューア")).toBeVisible();

  await page
    .getByPlaceholder("https://example.com/video-or-stream")
    .fill("https://example.com/live/alpha.m3u8\nhttps://example.com/live/bravo.m3u8");
  await page.getByTitle("追加").first().click();
  await page.getByTitle("ライブラリ").first().click();

  await expect(page.locator('input[value="https://example.com/live/alpha.m3u8"]')).toBeVisible();
  await expect(page.locator('input[value="https://example.com/live/bravo.m3u8"]')).toBeVisible();
});
