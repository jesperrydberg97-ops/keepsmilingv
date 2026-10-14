import { expect, test } from "@playwright/test";

test("touch devices get a joystick, interact button and no page scroll", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the studio" }).tap();
  await expect(page.getByRole("button", { name: "Stations" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Explore freely" }).tap();
  await expect(page.locator("[role=presentation].rounded-full")).toBeVisible();
  // Walk up to the guide via fast travel-free path: tap the guide hotspot prompt by moving close.
  await page.getByRole("button", { name: "Stations" }).tap();
  await page.getByRole("dialog").getByRole("button", { name: /About noticeboard/ }).tap();
  await expect(page.getByRole("dialog")).toContainText("About KSV");
  await page.getByRole("button", { name: "Close" }).tap();
  await expect(page.getByRole("button", { name: "Interact" })).toBeVisible();
  const scroll = await page.evaluate(() => document.scrollingElement?.scrollHeight ?? 0);
  expect(scroll).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight + 1));
});
