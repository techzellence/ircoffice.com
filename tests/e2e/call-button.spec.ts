import { expect, test } from '@playwright/test';

test('the header Call Us button dials the office', async ({ page }) => {
  // It shipped as a <div> with no link and no script: on desktop, the most prominent call to
  // action on every page did nothing when clicked.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/contact');
  const button = page.locator('#btn-phone-number');
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute('href', 'tel:+16128225747');
});
