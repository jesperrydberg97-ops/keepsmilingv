import { expect, test } from "@playwright/test";

test.describe("accessible 2D routes", () => {
  for (const [path, heading] of [
    ["/projects", "Projects"],
    ["/prints", "Prints"],
    ["/blog", "Journal"],
    ["/about", "Keep Smiling Visuals"],
    ["/contact", "Start a project"],
    ["/timeline", "Timeline"],
    ["/privacy", "Privacy policy"],
    ["/terms", "Terms"],
  ] as const) {
    test(`${path} renders server-side with a heading`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  }

  test("home page is meaningful without the 3D experience", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain("Explore the studio");
    expect(html).toContain("View work without 3D");
    expect(html).toContain('href="/projects"');
    expect(html).toContain("application/ld+json");
  });

  test("placeholder content is visibly marked and not indexed", async ({ page }) => {
    await page.goto("/projects/placeholder-commercials");
    await expect(page.getByText("Placeholder", { exact: true }).first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("project without a video shows an honest unavailable state", async ({ page }) => {
    await page.goto("/projects/placeholder-events");
    await expect(page.getByText(/Video not available yet/)).toBeVisible();
  });

  test("prints offer a request flow, never a fake cart", async ({ page }) => {
    await page.goto("/prints/placeholder-print-1");
    await expect(page.getByRole("button", { name: /add to cart|buy now|checkout/i })).toHaveCount(0);
    await page.getByRole("button", { name: "Request a print" }).click();
    await expect(page.getByRole("button", { name: "Send print request" })).toBeVisible();
  });
});

test.describe("inquiry form", () => {
  test("validates each step and never fakes success", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Please enter your name")).toBeVisible();
    await page.getByLabel(/^Name/).fill("Alex Example");
    await page.getByLabel(/^Email/).fill("alex@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Please choose a project type")).toBeVisible();
    await page.getByText("Commercial", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel(/Project description/).fill("A sixty second brand film for our spring launch in Gothenburg.");
    await page.getByRole("checkbox").check();
    await page.waitForTimeout(3100); // human-speed time trap
    await page.getByRole("button", { name: "Send inquiry" }).click();
    // No email provider is configured in this test run → honest failure + mailto fallback.
    await expect(page.getByRole("alert").filter({ hasText: "nothing was sent" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Email .* instead/ })).toHaveAttribute("href", /^mailto:/);
    await expect(page.getByText("Inquiry sent")).toHaveCount(0);
  });
});
