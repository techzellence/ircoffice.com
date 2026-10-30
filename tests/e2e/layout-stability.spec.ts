import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`map, logos and verification retain their space at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({contentType:'application/javascript',body:''}));
    await page.goto('/');
    const map = await page.locator('#map').boundingBox();
    const wrapper = await page.locator('.map__wrapper').boundingBox();
    const footer = await page.locator('.footer').boundingBox();
    expect(map!.y + map!.height).toBeLessThanOrEqual(wrapper!.y + wrapper!.height);
    expect(wrapper!.y + wrapper!.height).toBeLessThanOrEqual(footer!.y + 1);
    const logo = page.locator('.nav__logo--footer');
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(720 / 153, 1);
    const form = page.locator('form.form').first();
    const before = await form.locator('button').boundingBox();
    await form.locator('.cf-turnstile').evaluate(el => {
      const widget = document.createElement('div');
      widget.style.cssText = 'width:150px;height:140px';
      el.append(widget);
    });
    const after = await form.locator('button').boundingBox();
    expect(after!.y).toBeCloseTo(before!.y, 0);
    await expect(page.locator('.home-anniversary')).toHaveAttribute('src', '/img/anniversary-27.svg');
  });
}
