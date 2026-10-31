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

test('topic filters show matching articles and can be reset', async ({ page }) => {
  await page.goto('/blog');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.locator('.article-grid > li:visible')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'History', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Practical guides', exact: true }).click();
  await expect(page.locator('.article-grid > li:visible')).toHaveCount(4);
  await page.getByRole('button', { name: 'All articles', exact: true }).click();
  await expect(page.locator('.article-grid > li:visible')).toHaveCount(6);
});

test('article navigation and citations resolve to real sections', async ({ page }) => {
  await page.goto('/blog/naturalization-paperwork-preparation-minneapolis');
  const links = page.locator('.contents-panel a, .article-prose sup a');
  expect(await links.count()).toBeGreaterThan(5);
  for (const href of await links.evaluateAll(nodes => nodes.map(n => n.getAttribute('href')!))) {
    await expect(page.locator(`[id="${href.slice(1)}"]`)).toHaveCount(1);
  }
  await page.locator('.contents-panel a').first().click();
  await expect(page).toHaveURL(/#start-with-the-current-form-and-instructions$/);
});

test('the library remains useful without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:8788/blog');
  await expect(page.locator('.article-grid > li:visible')).toHaveCount(6);
  await expect(page.locator('.topic-filters')).toBeHidden();
  await context.close();
});

test('showing topic controls does not move the article list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route('**/_astro/*.js', async route => {
    await scriptsReady;
    await route.continue();
  });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto('/blog', { waitUntil: 'commit' });
  const grid = page.locator('.article-grid');
  await expect(grid).toBeVisible();
  await expect(page.locator('.topic-filters')).toBeHidden();
  const before = await grid.boundingBox();
  releaseScripts();
  await expect(page.locator('.topic-filters')).toBeVisible();
  const after = await grid.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 0);
});
