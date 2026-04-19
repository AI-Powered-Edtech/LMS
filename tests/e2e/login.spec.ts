import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("should display login page with all components", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for login form elements
    await expect(page.getByPlaceholder("kamu@email.com")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Check for demo buttons
    await expect(page.getByText(/Siswa Demo|Siswa Demosiswa/i)).toBeVisible();
    await expect(page.getByText(/Guru Demo|Guru Demoguru/i)).toBeVisible();

    // Check page title
    await expect(page).toHaveTitle(/Masuk|EduSync/i);
  });

  test("should click teacher demo button", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const initialUrl = page.url();
    console.log("Initial URL:", initialUrl);

    // Click teacher demo button
    const guruDemoBtn = page.getByText(/👩‍🏫 Guru Demo/i);
    await guruDemoBtn.click();

    // Wait a bit for any navigation
    await page.waitForTimeout(3000);

    const afterUrl = page.url();
    console.log("After click URL:", afterUrl);

    // Take screenshot
    await page.screenshot({ path: "after-teacher-click.png", fullPage: true });

    // Get page content
    const body = await page.locator("body").textContent();
    console.log("Body text (first 500 chars):", body?.slice(0, 500));
  });

  test("should show password field", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Password field should have dots placeholder
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible();

    const placeholder = await passwordField.getAttribute("placeholder");
    expect(placeholder).toContain("•");
  });

  test("should show friendly error when login request fails", async ({ page }) => {
    await page.route("**/api/v1/health", (route) => route.fulfill({ status: 200 }));
    await page.route("**/api/v1/auth/login", (route) => route.abort());
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("login-email-input").fill("teacher@edusync.dev");
    await page.getByTestId("login-password-input").fill("password123");
    await page.getByTestId("login-submit-button").click();

    await expect(page.getByRole("alert")).toContainText("Gagal terhubung ke server");
  });

  test("demo access emails should not overflow their buttons", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const buttons = [
      page.getByRole("button", { name: /Siswa Demo/i }),
      page.getByRole("button", { name: /Guru Demo/i }),
      page.getByRole("button", { name: /Admin Demo/i }),
    ];

    for (const button of buttons) {
      const email = button.locator("div").nth(1);
      const buttonBox = await button.boundingBox();
      const emailBox = await email.boundingBox();

      expect(buttonBox).toBeTruthy();
      expect(emailBox).toBeTruthy();

      if (!buttonBox || !emailBox) continue;

      expect(emailBox.x).toBeGreaterThanOrEqual(buttonBox.x - 1);
      expect(emailBox.y).toBeGreaterThanOrEqual(buttonBox.y - 1);
      expect(emailBox.x + emailBox.width).toBeLessThanOrEqual(buttonBox.x + buttonBox.width + 1);
      expect(emailBox.y + emailBox.height).toBeLessThanOrEqual(buttonBox.y + buttonBox.height + 1);
    }
  });
});
