import { expect, test } from '@playwright/test';

test('readers can open all six articles from the blog', async ({ page, request }) => {
  await page.goto('/blog');
  const links = page.locator('main li a');
  await expect(links).toHaveCount(6);
  const urls = await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href')!));
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(await response.text()).toContain('BlogPosting');
  }
  await links.first().click();
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.getByRole('link', { name: 'All articles', exact: true })).toBeVisible();
});

test('article text and its preparation table fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blog/naturalization-paperwork-preparation-minneapolis');
  await expect(page.locator('main table')).toBeVisible();
  const dimensions = await page.locator('main').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, font: parseFloat(getComputedStyle(el).fontSize) }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  expect(dimensions.font).toBeGreaterThanOrEqual(16);
});
