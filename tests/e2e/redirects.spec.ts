import { expect, test } from '@playwright/test';

const REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ['/greencard.html', '/green-card'],
  ['/visa.html', '/visa'],
  ['/citizenship.html', '/citizenship'],
  ['/contact.html', '/contact'],
  ['/green-card66789dc8', '/green-card'],
  ['/citizhenship', '/citizenship'],
];

for (const [from, to] of REDIRECTS) {
  test(`${from} redirects to ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toContain(to);
  });
}

test('every live route resolves', async ({ request }) => {
  const routes = [
    '/', '/green-card', '/visa', '/citizenship',
    '/contact', '/about', '/umra', '/privacy', '/blog',
  ];
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), `${route} should be 200`).toBe(200);
  }
});
