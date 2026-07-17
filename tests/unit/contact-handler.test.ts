import { beforeEach, describe, expect, it, vi } from 'vitest';

import { onRequestPost } from '../../functions/api/contact';

const RECIPIENT = 'office@ircoffice.com';

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    RESEND_API_KEY: 're_test_key',
    CONTACT_RECIPIENT: RECIPIENT,
    TURNSTILE_SECRET_KEY: 'turnstile_test',
    RATE_LIMIT: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

function makeRequest(body: Record<string, string>): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(body)) form.append(k, v);
  return new Request('https://www.ircoffice.com/api/contact', {
    method: 'POST',
    body: form,
    headers: { 'CF-Connecting-IP': '203.0.113.5' },
  });
}

const validBody = {
  name: 'Amina Yusuf',
  email: 'amina@example.com',
  phone: '612-555-0142',
  message: 'Hello',
  subject: 'Contact',
  'cf-turnstile-response': 'valid-token',
  website: '',
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('challenges.cloudflare.com')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
    }),
  );
});

describe('onRequestPost', () => {
  it('sends to the configured recipient on a valid submission', async () => {
    const res = await onRequestPost({ request: makeRequest(validBody), env: makeEnv() } as never);
    expect(res.status).toBe(200);

    const resendCall = (fetch as never as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('resend.com'),
    );
    expect(resendCall).toBeDefined();
    const payload = JSON.parse((resendCall![1] as RequestInit).body as string);
    expect(payload.to).toBe(RECIPIENT);
  });

  it('ignores an attacker-supplied recipient and still sends to the configured one', async () => {
    const res = await onRequestPost({
      request: makeRequest({ ...validBody, to: 'attacker@example.com' }),
      env: makeEnv(),
    } as never);
    expect(res.status).toBe(200);

    const resendCall = (fetch as never as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('resend.com'),
    );
    const payload = JSON.parse((resendCall![1] as RequestInit).body as string);
    expect(payload.to).toBe(RECIPIENT);
    expect(JSON.stringify(payload)).not.toContain('attacker@example.com');
  });

  it('silently discards a submission with the honeypot filled, without sending', async () => {
    const res = await onRequestPost({
      request: makeRequest({ ...validBody, website: 'http://spam.example' }),
      env: makeEnv(),
    } as never);
    expect(res.status).toBe(200);

    const resendCall = (fetch as never as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('resend.com'),
    );
    expect(resendCall).toBeUndefined();
  });

  it('rejects a failed Turnstile check', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 })),
    );
    const res = await onRequestPost({ request: makeRequest(validBody), env: makeEnv() } as never);
    expect(res.status).toBe(403);
  });

  it('rejects an invalid submission with 400 and does not send', async () => {
    const res = await onRequestPost({
      request: makeRequest({ ...validBody, email: 'nonsense' }),
      env: makeEnv(),
    } as never);
    expect(res.status).toBe(400);

    const resendCall = (fetch as never as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('resend.com'),
    );
    expect(resendCall).toBeUndefined();
  });

  it('rejects a rate-limited IP with 429', async () => {
    const env = makeEnv({
      RATE_LIMIT: { get: vi.fn().mockResolvedValue('5'), put: vi.fn() },
    });
    const res = await onRequestPost({ request: makeRequest(validBody), env } as never);
    expect(res.status).toBe(429);
  });

  it('counts a failed submission against the rate limit, not just successes', async () => {
    const env = makeEnv();
    await onRequestPost({
      request: makeRequest({ ...validBody, email: 'nonsense' }),
      env,
    } as never);
    // A request that never reaches Resend must still burn quota, or the
    // endpoint can be hammered for free.
    expect(env.RATE_LIMIT.put).toHaveBeenCalledWith(
      'rl:203.0.113.5',
      '1',
      expect.objectContaining({ expirationTtl: 3600 }),
    );
  });

  it('counts a honeypot hit against the rate limit', async () => {
    const env = makeEnv();
    await onRequestPost({
      request: makeRequest({ ...validBody, website: 'http://spam.example' }),
      env,
    } as never);
    expect(env.RATE_LIMIT.put).toHaveBeenCalled();
  });

  it('does not increment once already over the limit', async () => {
    const env = makeEnv({
      RATE_LIMIT: { get: vi.fn().mockResolvedValue('5'), put: vi.fn() },
    });
    await onRequestPost({ request: makeRequest(validBody), env } as never);
    expect(env.RATE_LIMIT.put).not.toHaveBeenCalled();
  });

  it('returns 502 when Resend fails, so the UI can report an honest error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('challenges.cloudflare.com')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response('upstream boom', { status: 500 });
      }),
    );
    const res = await onRequestPost({ request: makeRequest(validBody), env: makeEnv() } as never);
    expect(res.status).toBe(502);
  });
});
