import { expect, test } from '@playwright/test';

test.describe('service tabs', () => {
  test('shows the first tab by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-1')).toBeVisible();
    await expect(page.locator('#tab-2')).toBeHidden();
  });

  test('switches panels on click', async ({ page }) => {
    await page.goto('/');
    await page.click('[href="#tab-2"]');
    await expect(page.locator('#tab-2')).toBeVisible();
    await expect(page.locator('#tab-1')).toBeHidden();
  });

  test('is keyboard operable', async ({ page }) => {
    await page.goto('/');
    await page.locator('[href="#tab-2"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tab-2')).toBeVisible();
  });
});
