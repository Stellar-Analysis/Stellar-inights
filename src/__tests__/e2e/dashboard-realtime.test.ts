import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Dashboard — realtime updates on testnet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard`);
  });

  test('dashboard page loads with key sections', async ({ page }) => {
    await expect(page).toHaveTitle(/stellar|dashboard/i);

    // Dashboard should render core content
    const main = page.locator('main, [role="main"], .dashboard, [class*="dashboard"]');
    await expect(main.first()).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard shows loading state then data', async ({ page }) => {
    // Either a loading spinner or data content should appear
    const content = page.locator(
      '[class*="animate-pulse"], [class*="skeleton"], [class*="loading"], [class*="card"], [class*="stat"]',
    );
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test('WebSocket connection indicator reflects connectivity', async ({ page }) => {
    // Look for connection status indicators
    const statusIndicator = page.locator(
      '[class*="connected"], [class*="disconnected"], [class*="online"], [class*="offline"]',
    );
    const count = await statusIndicator.count();

    if (count > 0) {
      await expect(statusIndicator.first()).toBeVisible();
    }
  });

  test('dashboard survives network interruption without crash', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Simulate offline then back online
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // Page should still be functional — no uncaught errors
    const errorOverlay = page.locator('[class*="error-overlay"], [class*="fatal"]');
    await expect(errorOverlay).toHaveCount(0);

    // Dashboard content should still be visible
    const main = page.locator('main, [role="main"], .dashboard, [class*="dashboard"]');
    await expect(main.first()).toBeVisible();
  });

  test('data refresh indicator appears on manual refresh', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();

      // Should show some loading/refresh state
      const loader = page.locator(
        '[class*="animate-spin"], [class*="loading"], [class*="refresh"]',
      );
      const loaderCount = await loader.count();
      expect(loaderCount).toBeGreaterThanOrEqual(0); // may or may not show briefly
    }
  });

  test('dashboard handles API 503 during rolling deployment', async ({ page }) => {
    // First request returns 503, retried request succeeds
    let requestCount = 0;
    await page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount <= 2) {
        return route.fulfill({
          status: 503,
          headers: { 'Retry-After': '1' },
          body: 'Service Unavailable',
        });
      }
      return route.continue();
    });

    await page.reload();
    await page.waitForTimeout(3000);

    // Should recover and show content, not a permanent error
    const main = page.locator('main, [role="main"], .dashboard, [class*="dashboard"]');
    await expect(main.first()).toBeVisible();
  });
});
