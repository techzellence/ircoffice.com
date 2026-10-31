import { expect, test } from '@playwright/test';

for (const width of [320, 768, 1440, 2560]) {
  test(`live review layout stays centered and stable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.swiper')).toHaveClass(/swiper-initialized/);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.swiper').evaluate((el: any) => el.swiper.autoplay.stop());
    await page.locator('.slider__image-wrapper').scrollIntoViewIfNeeded();
    const measure = () => page.evaluate(() => {
      const container = document.querySelector('.swiper')!.getBoundingClientRect();
      const quote = document.querySelector('.swiper-slide-active .paragraph__slider')!.getBoundingClientRect();
      const following = document.querySelector('#WhoAreWe')!.getBoundingClientRect();
      return { height:container.height, following:following.top + scrollY,
        center:Math.abs((quote.left + quote.right - container.left - container.right) / 2),
        overflow:document.documentElement.scrollWidth > innerWidth };
    });
    const initial = await measure();
    for (let i = 0; i < 3; i++) {
      await page.locator('.swiper').evaluate((el: any, index) => el.swiper.slideTo(index, 0), i);
      await expect.poll(async () => (await measure()).center).toBeLessThan(1);
      const current = await measure();
      expect(current.height).toBeCloseTo(initial.height, 0);
      expect(current.following).toBeCloseTo(initial.following, 0);
      expect(current.overflow).toBe(false);
    }
  });
}
