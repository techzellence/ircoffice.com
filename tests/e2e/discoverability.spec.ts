import { expect, test } from '@playwright/test';

test('serves the AI reading guide as plain text', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(await response.text()).toContain('# Immigrant Resource Center');
});

for (const agent of ['Googlebot', 'bingbot', 'OAI-SearchBot']) {
  test(`serves readable HTML to ${agent} without JavaScript`, async ({ request }) => {
    const response = await request.get('/', { headers: { 'User-Agent': agent } });
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag'] ?? '').not.toContain('noindex');
    const html = await response.text();
    expect(html).toContain('application/ld+json');
    expect(html).toContain('href="/green-card"');
    expect(html).toContain('Immigrant Resource Center');
  });
}
