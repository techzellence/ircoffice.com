import { validateSubmission } from '../../src/lib/contact-validation';
import { buildEmail } from '../../src/lib/email-template';

// Minimal shape of the Cloudflare KV binding actually used below. Defined
// locally rather than pulling in @cloudflare/workers-types (a new
// dependency) purely for this one ambient type; the platform supplies the
// real binding at deploy time and validates it against wrangler.toml.
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  RESEND_API_KEY: string;
  CONTACT_RECIPIENT: string;
  TURNSTILE_SECRET_KEY: string;
  RATE_LIMIT: KVNamespace;
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 3600;
const SENDER = 'IRC Website <noreply@send.ircoffice.com>';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

// The Pages Functions context type is supplied by the Cloudflare runtime at
// deploy time; `any` here avoids pulling in @cloudflare/workers-types purely
// for a signature that the platform validates itself.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context as { request: Request; env: Env };
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  const attempts = Number((await env.RATE_LIMIT.get(`rl:${ip}`)) ?? '0');
  if (attempts >= RATE_LIMIT_MAX) {
    return json({ error: 'Too many requests. Please try again later.' }, 429);
  }

  // Increment on ATTEMPT, not on success. Counting only successful sends
  // would let an attacker hammer Turnstile verification and validation
  // indefinitely without ever tripping the limit. KV is eventually
  // consistent, so this is best-effort — it raises the cost of abuse, it
  // does not make it impossible. Cloudflare WAF rate limiting is the
  // hard control; this is defence in depth.
  await env.RATE_LIMIT.put(`rl:${ip}`, String(attempts + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
  });

  const form = await request.formData();
  const raw: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') raw[key] = value;
  }

  // Honeypot: bots fill hidden fields. Return 200 so they cannot tell.
  if ((raw.website ?? '') !== '') {
    return json({ ok: true }, 200);
  }

  const passedTurnstile = await verifyTurnstile(
    raw['cf-turnstile-response'] ?? '',
    env.TURNSTILE_SECRET_KEY,
    ip,
  );
  if (!passedTurnstile) {
    return json({ error: 'Verification failed. Please try again.' }, 403);
  }

  const result = validateSubmission(raw);
  if (!result.ok) {
    return json({ error: 'Please check the form and try again.', details: result.errors }, 400);
  }

  const { subject, text } = buildEmail(result.value);

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: SENDER,
      // Recipient is a server-side constant. It is never read from the request.
      to: env.CONTACT_RECIPIENT,
      reply_to: result.value.email,
      subject,
      text,
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    console.error('Resend send failed', {
      status: resendResponse.status,
      detail,
      subject: result.value.subject,
      ip,
    });
    return json({ error: 'We could not send your message. Please call us at (612) 822-5747.' }, 502);
  }

  return json({ ok: true }, 200);
}
