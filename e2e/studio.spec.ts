import { expect, test, type Page } from "@playwright/test";

async function enterStudio(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the studio" }).click();
  await expect(page.getByRole("button", { name: "Stations" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("canvas")).toHaveCount(1);
}

test.describe("3D studio", () => {
  test("welcome guide greets and can be dismissed", async ({ page }) => {
    await enterStudio(page);
    const guide = page.getByRole("region", { name: /KSV founder says/ });
    await expect(guide).toContainText("welcome to Keep Smiling Visuals");
    await guide.getByRole("button", { name: "Explore freely" }).click();
    await expect(guide).toHaveCount(0);
  });

  test("fast travel opens stations; Escape and Back close them", async ({ page }) => {
    await enterStudio(page);
    await page.getByRole("button", { name: "Explore freely" }).click();
    const stationsBtn = page.getByRole("button", { name: "Stations" });
    await stationsBtn.click();
    await page.getByRole("dialog").getByRole("button", { name: /Project TV/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Project TV");
    await expect(dialog.getByRole("button", { name: "All Projects" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Avatar now stands at the TV: the proximity prompt is shown and E interacts.
    await expect(page.getByText("Browse projects")).toBeVisible();
    await page.keyboard.press("e");
    await expect(page.getByRole("dialog")).toContainText("Project TV");
    await page.goBack();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("booking desk opens the real inquiry form", async ({ page }) => {
    await enterStudio(page);
    await page.getByRole("button", { name: "Book a project" }).click();
    await expect(page.getByRole("dialog")).toContainText("Film project inquiry");
    await expect(page.getByLabel(/^Name/)).toBeVisible();
  });

  test("movement keys move the avatar; typing in a panel isn't hijacked", async ({ page }) => {
    await enterStudio(page);
    await page.getByRole("button", { name: "Explore freely" }).click();
    // The minimap's player marker reflects the avatar position.
    const marker = page.locator('nav[aria-label="Minimap"] g[aria-hidden]');
    const before = await marker.getAttribute("transform");
    // Hold W until the avatar has visibly moved. Software-rendered CI runners
    // can produce only a few frames per second, so don't rely on a fixed delay.
    await page.keyboard.down("w");
    await expect.poll(() => marker.getAttribute("transform"), { timeout: 30_000 }).not.toBe(before);
    await page.keyboard.up("w");

    await page.getByRole("button", { name: "Stations" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Booking desk/ }).click();
    const name = page.getByLabel(/^Name/);
    await name.fill("");
    await name.pressSequentially("wasd e");
    await expect(name).toHaveValue("wasd e");
    await expect(page.getByRole("dialog")).toContainText("Film project inquiry");
  });

  test("settings and controls help are reachable by keyboard", async ({ page }) => {
    await enterStudio(page);
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("dialog")).toContainText("Graphics quality");
    await page.getByRole("switch", { name: /Reduced motion/ }).check();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Controls help" }).click();
    await expect(page.getByRole("dialog")).toContainText("Walk to a spot");
  });
});
