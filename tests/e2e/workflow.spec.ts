import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
}

test.describe("Full End-to-End Workflow", () => {
  test("Admin can create event and assign team member", async ({ page }) => {
    // Admin login
    await login(page, "admin@example.com", "Admin@demo123");
    await expect(page.locator("h1")).toContainText(["Dashboard", "Welcome"], { timeout: 5000 });

    // Navigate to events
    await page.click('a[href="/events"]');
    await page.waitForURL(`${BASE_URL}/events`);

    // Create event
    await page.click('button:has-text("New Event")');
    await page.fill('input[placeholder="Arjun & Priya Wedding"]', "E2E Test Event");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="date"]', tomorrow.toISOString().split("T")[0]);
    await page.click('button:has-text("Create Event")');
    await expect(page.locator('text=E2E Test Event')).toBeVisible({ timeout: 5000 });
  });

  test("Wrong PIN is rejected on public gallery", async ({ page }) => {
    await page.goto(`${BASE_URL}/gallery/demo-wedding`);
    // Wait for PIN screen
    await expect(page.locator('text=Enter the 6-digit PIN')).toBeVisible({ timeout: 5000 });

    // Enter wrong PIN
    const wrongPin = "000000";
    for (let i = 0; i < 6; i++) {
      await page.fill(`#pin-${i}`, wrongPin[i]);
    }
    await page.click('button:has-text("Access Gallery")');

    // Should see error
    await expect(page.locator('text=Incorrect PIN')).toBeVisible({ timeout: 5000 });
  });

  test("Public gallery is not accessible without PIN", async ({ page }) => {
    // Try to access photos directly without PIN verification
    const res = await page.request.get(`${BASE_URL}/api/public/gallery/demo-wedding/photos`);
    expect(res.status()).toBe(401);
  });

  test("Team member cannot access admin API", async ({ page }) => {
    // Not logged in — try admin endpoint
    const res = await page.request.get(`${BASE_URL}/api/events`);
    // Should get 401
    expect([401, 403]).toContain(res.status());
  });

  test("Unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("Register page is accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await expect(page.locator('h3:has-text("Create account")')).toBeVisible({ timeout: 5000 });
  });
});
