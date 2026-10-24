import { expect, test, type Page } from '@playwright/test';

// Stand-in for Cloudflare's Turnstile script. It renders nothing; it only counts resets, which is
// the behaviour under test. Serving it from the real URL keeps the page's CSP in play.
const TURNSTILE_STUB = `
  window.__turnstileResets = 0;
  window.turnstile = {
    render() { return 'stub'; },
    reset() { window.__turnstileResets += 1; },
  };
`;

const FORM = '#form__contact';

async function openContactPage(page: Page): Promise<void> {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: TURNSTILE_STUB }),
  );
  await page.goto('/contact');
}

async function fillValidForm(page: Page): Promise<void> {
  await page.fill(`${FORM}-name`, 'Test Visitor');
  await page.fill(`${FORM}-email`, 'visitor@example.com');
  await page.fill(`${FORM}-phone`, '612-555-0100');
  await page.fill(`${FORM}-message`, 'First line\nSecond line');
}

test.describe('contact form', () => {
  test('flags an invalid email without sending anything', async ({ page }) => {
    await openContactPage(page);
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/contact')) posts.push(request.url());
    });

    await fillValidForm(page);
    await page.fill(`${FORM}-email`, 'not-an-email');
    await page.click(`${FORM} button[type="submit"]`);

    await expect(page.locator(`${FORM} .form__error`)).toHaveText(
      'Please enter a valid email address.',
    );
    await expect(page.locator(`${FORM}-email`)).toBeFocused();
    expect(posts).toHaveLength(0);
  });

  test('gets a fresh Turnstile token after a failed attempt', async ({ page }) => {
    await openContactPage(page);
    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Verification failed. Please try again.' }),
      }),
    );

    await fillValidForm(page);
    await page.click(`${FORM} button[type="submit"]`);

    await expect(page.locator(`${FORM} .form__error`)).toContainText('Please try again');
    await expect(page.locator(`${FORM} button[type="submit"]`)).toBeEnabled();
    expect(await page.evaluate(() => (window as never as { __turnstileResets: number })
      .__turnstileResets)).toBe(1);
  });

  test('shows the server-side reason when the address is rejected', async ({ page }) => {
    await openContactPage(page);
    await page.route('**/api/contact', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Please check the form and try again.',
          details: ['email is not a valid address'],
        }),
      }),
    );

    await fillValidForm(page);
    await page.fill(`${FORM}-email`, 'visitor@localhost');
    await page.click(`${FORM} button[type="submit"]`);

    await expect(page.locator(`${FORM} .form__error`)).toHaveText(
      'Please enter a valid email address.',
    );
  });

  test('thanks the visitor once the message is sent', async ({ page }) => {
    await openContactPage(page);
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    );

    await fillValidForm(page);
    await page.click(`${FORM} button[type="submit"]`);

    const status = page.locator(`${FORM} [role="status"]`);
    await expect(status).toContainText('Thank you for contacting us.');
    await expect(page.locator(`${FORM} input[name="email"]`)).toHaveCount(0);
  });
});
