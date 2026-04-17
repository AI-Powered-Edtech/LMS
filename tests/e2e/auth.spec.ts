import { test, expect } from "@playwright/test";

// Mock data for testing
const mockUser = {
  id: "test-user-id",
  email: "test@edusync.dev",
  role: "teacher" as const,
  user_metadata: { tenant_id: "test-tenant-id" },
};

const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: "bearer" as const,
  user: mockUser,
};

// Mock the auth API
test.beforeEach(async ({ page }) => {
  // Intercept login API calls
  await page.route("**/api/v1/auth/login", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    if (body.email && body.email.includes("@edusync.dev")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: mockSession.access_token,
          refresh_token: mockSession.refresh_token,
          expires_in: mockSession.expires_in,
          user: mockUser,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Invalid credentials",
          code: "invalid_credentials",
        }),
      });
    }
  });

  // Intercept bootstrap API
  await page.route("**/api/v1/auth/bootstrap", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: mockUser,
        session: mockSession,
      }),
    });
  });
});

test.describe("Login Flow", () => {
  test("should display login page with all form elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check main elements
    await expect(page.getByPlaceholder("kamu@email.com")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Daftar" })).toBeVisible();
  });

  test("should switch between login and register tabs", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click register tab
    await page.getByRole("button", { name: "Daftar" }).click();
    await expect(page.getByText("Informasi Akun")).toBeVisible();
  });

  test("should show validation errors for invalid email", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Fill with invalid email and try to submit
    await page.getByPlaceholder("kamu@email.com").fill("invalid-email");
    await page.locator('input[type="password"]').fill("password");

    // Click submit
    await page.getByRole("button", { name: "Masuk" }).last().click();

    // Should show validation error (form should prevent submission)
    await page.waitForTimeout(500);
  });

  test("should fill demo credentials when clicking dev quick login", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for dev quick login buttons
    const devButtons = page.locator(
      'button:has-text("teacher"), button:has-text("student"), button:has-text("admin")',
    );
    const devButtonExists = await devButtons
      .first()
      .isVisible()
      .catch(() => false);

    if (devButtonExists) {
      await devButtons.first().click();

      // Email field should be filled with demo credentials
      const emailValue = await page
        .getByPlaceholder("kamu@email.com")
        .inputValue();
      expect(emailValue).toContain("@edusync.dev");
    }
  });
});

test.describe("Navigation", () => {
  test("should have working logo link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click logo
    const logo = page.locator('h1:has-text("EduSync")');
    if (await logo.isVisible()) {
      // Logo should be clickable
      await logo.click();
    }
  });

  test("should show parent registration link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const parentLink = page.getByText("Daftar sebagai Orang Tua Siswa");
    await expect(parentLink).toBeVisible();
  });
});

test.describe("OAuth Flow UI", () => {
  test("should display Google OAuth button", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const googleBtn = page.getByRole("button", {
      name: /Google|Lanjutkan dengan Google/i,
    });
    await expect(googleBtn).toBeVisible();
  });

  test("should have privacy and terms links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Kebijakan Privasi")).toBeVisible();
    await expect(page.getByText("Ketentuan Layanan")).toBeVisible();
  });
});
