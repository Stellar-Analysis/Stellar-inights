import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Network Switcher — testnet flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard`);
  });

  test('displays current network on load', async ({ page }) => {
    const switcher = page.getByRole('button', { name: /network/i });
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText(/testnet|mainnet/i);
  });

  test('opens network dropdown and lists available networks', async ({ page }) => {
    const switcher = page.getByRole('button', { name: /network/i });
    await switcher.click();

    const listbox = page.getByRole('listbox', { name: /available networks/i });
    await expect(listbox).toBeVisible();

    const options = listbox.getByRole('option');
    await expect(options).toHaveCount(2);
  });

  test('selecting a different network shows confirmation warning', async ({ page }) => {
    const switcher = page.getByRole('button', { name: /network/i });
    await switcher.click();

    // Click the non-active network option
    const options = page.getByRole('option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const isSelected = await option.getAttribute('aria-selected');
      if (isSelected !== 'true') {
        await option.click();
        break;
      }
    }

    const dialog = page.getByRole('dialog', { name: /switch network/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/warning/i);
  });

  test('cancelling network switch keeps the current network', async ({ page }) => {
    const switcher = page.getByRole('button', { name: /network/i });
    const initialText = await switcher.textContent();
    await switcher.click();

    const options = page.getByRole('option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const isSelected = await option.getAttribute('aria-selected');
      if (isSelected !== 'true') {
        await option.click();
        break;
      }
    }

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(switcher).toContainText(initialText!.trim());
  });

  test('confirming network switch updates the displayed network', async ({ page }) => {
    await page.route('**/api/network/switch', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Network switched. Restart required.' }),
      }),
    );

    page.on('dialog', (dialog) => dialog.accept());

    const switcher = page.getByRole('button', { name: /network/i });
    await switcher.click();

    const options = page.getByRole('option');
    let targetName = '';
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const isSelected = await option.getAttribute('aria-selected');
      if (isSelected !== 'true') {
        targetName = (await option.textContent()) ?? '';
        await option.click();
        break;
      }
    }

    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(switcher).toContainText(targetName.split('(')[0].trim());
  });
});
