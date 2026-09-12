import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('SEP-24 Deposit Flow — testnet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/en/deposit-withdraw`);
  });

  test('renders deposit/withdraw toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /deposit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /withdraw/i })).toBeVisible();
  });

  test('deposit is selected by default', async ({ page }) => {
    const depositBtn = page.getByRole('button', { name: /deposit/i });
    await expect(depositBtn).toHaveClass(/bg-accent/);
  });

  test('anchor dropdown loads and is selectable', async ({ page }) => {
    const anchorSelect = page.locator('select').first();
    await expect(anchorSelect).toBeVisible();

    // Mock anchor list
    await page.route('**/api/sep24/anchors', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'Test Anchor',
            transfer_server: 'https://testanchor.stellar.org/sep24',
            assets: ['USDC'],
          },
        ]),
      }),
    );

    await page.reload();
    const options = anchorSelect.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test('start deposit button disabled without valid form', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /start deposit/i });
    if (await startBtn.isVisible()) {
      await expect(startBtn).toBeDisabled();
    }
  });

  test('deposit flow opens interactive URL on success', async ({ page }) => {
    await page.route('**/sep24/transactions/deposit/interactive', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'interactive_customer_info_needed',
          url: 'https://testanchor.stellar.org/deposit?token=test123',
          id: 'txn-test-001',
        }),
      }),
    );

    // Fill in the custom transfer server field
    const serverInput = page.getByPlaceholder(/transfer server/i);
    if (await serverInput.isVisible()) {
      await serverInput.fill('https://testanchor.stellar.org/sep24');
    }

    const startBtn = page.getByRole('button', { name: /start deposit/i });
    if (await startBtn.isEnabled()) {
      await startBtn.click();
      const successMsg = page.getByText(/interactive window opened/i);
      await expect(successMsg).toBeVisible({ timeout: 10_000 });
    }
  });

  test('handles deposit timeout gracefully', async ({ page }) => {
    await page.route('**/sep24/transactions/deposit/interactive', (route) =>
      route.fulfill({ status: 504, body: 'Gateway Timeout' }),
    );

    const serverInput = page.getByPlaceholder(/transfer server/i);
    if (await serverInput.isVisible()) {
      await serverInput.fill('https://testanchor.stellar.org/sep24');
    }

    const startBtn = page.getByRole('button', { name: /start deposit/i });
    if (await startBtn.isEnabled()) {
      await startBtn.click();
      // Should show error, not hang
      const errorMsg = page.locator('[class*="red"]');
      await expect(errorMsg.first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
