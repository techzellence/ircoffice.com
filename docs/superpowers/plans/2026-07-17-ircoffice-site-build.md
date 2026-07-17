# ircoffice.com Site Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ircoffice.com as a pixel-matched Astro static site on Cloudflare Pages, with a secure Resend-backed contact endpoint, replacing the defective static recreation.

**Architecture:** Astro in `output: 'static'` mode emits plain HTML — identical bytes to what the browser receives today, but nav/footer/form are authored once instead of nine times. A Cloudflare Pages Function is the only server-side component; it holds the Resend key and is the sole path from a form submission to an email. Pure validation logic is extracted into a separate module so it can be unit-tested without a network or a Workers runtime.

**Tech Stack:** Astro 5 (static), TypeScript (strict), Vitest (unit), Playwright (visual regression + E2E), Cloudflare Pages + Pages Functions, Resend, Leaflet + OpenStreetMap, Cloudflare Turnstile, Cloudflare Web Analytics.

**Source spec:** `docs/superpowers/specs/2026-07-17-ircoffice-migration-design.md`

**Scope boundary:** This plan covers software only. DNS work (SPF/DKIM/DMARC, nameserver cutover) requires GoDaddy / Google Workspace / Cloudflare console access, has no testable code, and is documented separately in `docs/superpowers/runbooks/`. Do not attempt DNS changes from this plan.

## Global Constraints

- **TypeScript strict mode.** Explicit return types on public functions. No `any` without an inline comment explaining why.
- **Indentation:** 2 spaces. **Line length:** 100 chars.
- **Imports:** grouped external → internal → relative, alphabetized within groups.
- **Conventional commits** (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). One logical change per commit.
- **Never commit secrets.** `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_RECIPIENT` live only in Cloudflare environment variables and a gitignored `.dev.vars`.
- **Never add a dependency not listed in this plan** without asking.
- **Routes must match the live site exactly:** `/`, `/green-card`, `/visa`, `/citizenship`, `/contact`, `/about`, `/umra`, `/privacy`, `/blog`. Rankings depend on this.
- **Pixel-match is the fidelity bar.** The live site at https://www.ircoffice.com is the source of truth for content and layout. Do not redesign. Do not "improve" copy.
- **The legal disclaimer must appear on every page.** IRC is a non-attorney practice; the not-a-law-firm / not-affiliated-with-USCIS notice is legally load-bearing, not boilerplate.
- **No jQuery.** It is being removed deliberately (1.12.4 has known XSS advisories).
- **Business hours are Mon–Fri 9–6, Sat 10–5** (live site is truth; the old `map.js` disagrees and is wrong).

---

### Task 1: Astro scaffold and test harness

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.dev.vars.example`
- Create: `src/lib/version.ts`, `tests/unit/version.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a building Astro project; `npm test` runs Vitest; `npm run build` emits static HTML to `dist/`

- [ ] **Step 1: Write the failing test**

`tests/unit/version.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { getSiteName } from '../../src/lib/version';

describe('getSiteName', () => {
  it('returns the site name', () => {
    expect(getSiteName()).toBe('Immigrant Resource Center');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/version.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/version`

This test is a harness smoke test. It proves Vitest resolves TypeScript from `src/` before any real logic depends on it.

- [ ] **Step 3: Create the project files**

`package.json`:

```json
{
  "name": "ircoffice",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "wrangler pages dev dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "astro check && tsc --noEmit"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "@playwright/test": "^1.48.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.80.0"
  }
}
```

`astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.ircoffice.com',
  output: 'static',
  build: {
    format: 'file',
  },
});
```

`build.format: 'file'` emits `/green-card.html` rather than `/green-card/index.html`. Cloudflare Pages serves this at the clean URL `/green-card`, which is what the live site uses.

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "types": ["vitest/globals"]
  },
  "exclude": ["dist"]
}
```

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

`.gitignore`:

```
node_modules/
dist/
.astro/
.dev.vars
.wrangler/
test-results/
playwright-report/
tests/visual/**/*-actual.png
tests/visual/**/*-diff.png
```

`.dev.vars.example`:

```
RESEND_API_KEY=re_placeholder_do_not_commit_a_real_key
CONTACT_RECIPIENT=someone@ircoffice.com
TURNSTILE_SECRET_KEY=placeholder
```

`src/lib/version.ts`:

```typescript
export function getSiteName(): string {
  return 'Immigrant Resource Center';
}
```

- [ ] **Step 4: Install and run the test**

Run: `npm install && npx vitest run tests/unit/version.test.ts`
Expected: PASS — 1 test passed

- [ ] **Step 5: Verify the build works**

Run: `npm run build`
Expected: build succeeds (zero pages is fine at this stage)

- [ ] **Step 6: Commit**

```bash
git add package.json astro.config.mjs tsconfig.json vitest.config.ts .gitignore \
        .dev.vars.example src/lib/version.ts tests/unit/version.test.ts
git commit -m "chore: scaffold Astro project with Vitest harness"
```

---

### Task 2: Contact form validation module

This task is first among the logic tasks because it is the security core, and because it is pure — no network, no Workers runtime, fully unit-testable. Task 3 wires it to Resend.

**Files:**
- Create: `src/lib/contact-validation.ts`
- Test: `tests/unit/contact-validation.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `interface ContactSubmission { name: string; email: string; phone: string; message: string; subject: string }`
  - `type ValidationResult = { ok: true; value: ContactSubmission } | { ok: false; errors: string[] }`
  - `function validateSubmission(raw: Record<string, unknown>): ValidationResult`
  - `function hasHeaderInjection(value: string): boolean`
  - `const FIELD_LIMITS: Readonly<Record<keyof ContactSubmission, number>>`

- [ ] **Step 1: Write the failing tests**

`tests/unit/contact-validation.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { hasHeaderInjection, validateSubmission } from '../../src/lib/contact-validation';

const valid = {
  name: 'Amina Yusuf',
  email: 'amina@example.com',
  phone: '612-555-0142',
  message: 'I would like to ask about the green card process.',
  subject: 'Contact',
};

describe('hasHeaderInjection', () => {
  it('accepts a clean string', () => {
    expect(hasHeaderInjection('Amina Yusuf')).toBe(false);
  });

  it('rejects a carriage return', () => {
    expect(hasHeaderInjection('Amina\rBcc: victim@example.com')).toBe(true);
  });

  it('rejects a line feed', () => {
    expect(hasHeaderInjection('Amina\nBcc: victim@example.com')).toBe(true);
  });

  it('rejects an encoded CRLF sequence', () => {
    expect(hasHeaderInjection('Amina\r\nBcc: victim@example.com')).toBe(true);
  });
});

describe('validateSubmission', () => {
  it('accepts a valid submission', () => {
    const result = validateSubmission(valid);
    expect(result.ok).toBe(true);
  });

  it('trims surrounding whitespace on accept', () => {
    const result = validateSubmission({ ...valid, name: '  Amina Yusuf  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Amina Yusuf');
  });

  it('rejects a header injection attempt in name', () => {
    const result = validateSubmission({ ...valid, name: 'Amina\r\nBcc: victim@example.com' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('name');
  });

  it('rejects a header injection attempt in subject', () => {
    const result = validateSubmission({ ...valid, subject: 'Contact\r\nBcc: victim@example.com' });
    expect(result.ok).toBe(false);
  });

  it('rejects a header injection attempt in email', () => {
    const result = validateSubmission({ ...valid, email: 'a@b.com\r\nBcc: victim@example.com' });
    expect(result.ok).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = validateSubmission({ ...valid, name: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects a whitespace-only name', () => {
    const result = validateSubmission({ ...valid, name: '   ' });
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed email', () => {
    const result = validateSubmission({ ...valid, email: 'not-an-email' });
    expect(result.ok).toBe(false);
  });

  it('rejects an over-long message', () => {
    const result = validateSubmission({ ...valid, message: 'x'.repeat(5001) });
    expect(result.ok).toBe(false);
  });

  it('rejects an over-long name', () => {
    const result = validateSubmission({ ...valid, name: 'x'.repeat(101) });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-string field', () => {
    const result = validateSubmission({ ...valid, name: 42 });
    expect(result.ok).toBe(false);
  });

  it('rejects a missing field entirely', () => {
    const { name, ...withoutName } = valid;
    const result = validateSubmission(withoutName);
    expect(result.ok).toBe(false);
  });

  it('allows an empty message (matches live form: message is optional)', () => {
    const result = validateSubmission({ ...valid, message: '' });
    expect(result.ok).toBe(true);
  });

  it('reports every failing field at once, not just the first', () => {
    const result = validateSubmission({ ...valid, name: '', email: 'bad' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(1);
  });

  it('ignores unexpected extra fields rather than passing them through', () => {
    const result = validateSubmission({ ...valid, to: 'attacker@example.com' });
    expect(result.ok).toBe(true);
    if (result.ok) expect('to' in result.value).toBe(false);
  });
});
```

The last test matters more than it looks: it pins down that a caller cannot smuggle a `to` field through validation. The recipient is a server constant; this test is the first line of defence for that.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/contact-validation.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/contact-validation`

- [ ] **Step 3: Write the implementation**

`src/lib/contact-validation.ts`:

```typescript
export interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
  message: string;
  subject: string;
}

export type ValidationResult =
  | { ok: true; value: ContactSubmission }
  | { ok: false; errors: string[] };

export const FIELD_LIMITS: Readonly<Record<keyof ContactSubmission, number>> = Object.freeze({
  name: 100,
  email: 254,
  phone: 40,
  message: 5000,
  subject: 100,
});

const OPTIONAL_FIELDS: ReadonlySet<keyof ContactSubmission> = new Set(['message']);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * True if the value contains CR or LF, which could break out of an email
 * header and inject additional headers (e.g. Bcc).
 */
export function hasHeaderInjection(value: string): boolean {
  return /[\r\n]/.test(value);
}

export function validateSubmission(raw: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const clean: Partial<ContactSubmission> = {};

  for (const field of Object.keys(FIELD_LIMITS) as (keyof ContactSubmission)[]) {
    const value = raw[field];

    if (typeof value !== 'string') {
      errors.push(`${field} is required`);
      continue;
    }

    if (hasHeaderInjection(value)) {
      errors.push(`${field} contains invalid characters`);
      continue;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0 && !OPTIONAL_FIELDS.has(field)) {
      errors.push(`${field} is required`);
      continue;
    }

    if (trimmed.length > FIELD_LIMITS[field]) {
      errors.push(`${field} exceeds ${FIELD_LIMITS[field]} characters`);
      continue;
    }

    clean[field] = trimmed;
  }

  if (clean.email !== undefined && !EMAIL_PATTERN.test(clean.email)) {
    errors.push('email is not a valid address');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Every key of ContactSubmission is populated once errors is empty.
  return { ok: true, value: clean as ContactSubmission };
}
```

Note the construction: the returned object is built key-by-key from `FIELD_LIMITS`, so an attacker-supplied `to` field is structurally incapable of surviving validation. That is a stronger guarantee than filtering it out.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/contact-validation.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/contact-validation.ts tests/unit/contact-validation.test.ts
git commit -m "feat: add contact form validation with header injection guards"
```

---

### Task 3: Contact Pages Function

Fixes the single most costly defect in the repo: the current forms show a success message and drop the lead.

**Files:**
- Create: `functions/api/contact.ts`, `src/lib/email-template.ts`
- Test: `tests/unit/email-template.test.ts`, `tests/unit/contact-handler.test.ts`

**Interfaces:**
- Consumes: `validateSubmission`, `ContactSubmission` from `src/lib/contact-validation.ts` (Task 2)
- Produces:
  - `function buildEmail(s: ContactSubmission): { subject: string; text: string }`
  - `async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response>`
  - `interface Env { RESEND_API_KEY: string; CONTACT_RECIPIENT: string; TURNSTILE_SECRET_KEY: string; RATE_LIMIT: KVNamespace }`

- [ ] **Step 1: Write the failing tests**

`tests/unit/email-template.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { buildEmail } from '../../src/lib/email-template';

const submission = {
  name: 'Amina Yusuf',
  email: 'amina@example.com',
  phone: '612-555-0142',
  message: 'Question about green cards.',
  subject: 'Green Card',
};

describe('buildEmail', () => {
  it('puts the form subject in the email subject', () => {
    expect(buildEmail(submission).subject).toContain('Green Card');
  });

  it('includes every submitted field in the body', () => {
    const { text } = buildEmail(submission);
    expect(text).toContain('Amina Yusuf');
    expect(text).toContain('amina@example.com');
    expect(text).toContain('612-555-0142');
    expect(text).toContain('Question about green cards.');
  });

  it('renders a placeholder when the message is empty', () => {
    const { text } = buildEmail({ ...submission, message: '' });
    expect(text).toContain('(no message)');
  });
});
```

`tests/unit/contact-handler.test.ts`:

```typescript
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
```

The 502 test encodes the whole point of this task. The old code resolved its `.then()` regardless of outcome and told the user "Thank you for contacting us." A failure must be a failure.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/email-template.test.ts tests/unit/contact-handler.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Write the implementations**

`src/lib/email-template.ts`:

```typescript
import type { ContactSubmission } from './contact-validation';

export function buildEmail(s: ContactSubmission): { subject: string; text: string } {
  const text = [
    `New enquiry from the ircoffice.com website`,
    ``,
    `Subject: ${s.subject}`,
    `Name:    ${s.name}`,
    `Email:   ${s.email}`,
    `Phone:   ${s.phone}`,
    ``,
    `Message:`,
    s.message.length > 0 ? s.message : '(no message)',
  ].join('\n');

  return { subject: `Website enquiry: ${s.subject}`, text };
}
```

`functions/api/contact.ts`:

```typescript
import { validateSubmission } from '../../src/lib/contact-validation';
import { buildEmail } from '../../src/lib/email-template';

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

  await env.RATE_LIMIT.put(`rl:${ip}`, String(attempts + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
  });

  return json({ ok: true }, 200);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/email-template.test.ts tests/unit/contact-handler.test.ts`
Expected: PASS — all tests pass

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add functions/api/contact.ts src/lib/email-template.ts \
        tests/unit/email-template.test.ts tests/unit/contact-handler.test.ts
git commit -m "feat: add contact endpoint with Resend, Turnstile, and rate limiting"
```

---

### Task 4: Base layout, Nav, Footer, Disclaimer

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/Disclaimer.astro`
- Reference (read, do not modify): `index.html`, `contact.html`
- Copy: `css/style.css` → `public/css/style.css`, `img/` → `public/img/`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `BaseLayout` accepting props `{ title: string; description: string; canonical: string }` and a default `<slot />`. `Nav`, `Footer`, `Disclaimer` take no props.

- [ ] **Step 1: Copy static assets**

```bash
mkdir -p public/css public/img
cp css/style.css public/css/style.css
cp -R img/* public/img/
```

- [ ] **Step 2: Extract the shared markup**

Read the `<head>`, navbar block, and footer block from `index.html`. They are duplicated near-identically across all five legacy pages; `index.html` is the reference copy.

Move the navbar markup into `src/components/Nav.astro` verbatim, with these corrections:
- Nav links point at the new routes: `/`, `/green-card`, `/visa`, `/citizenship`, `/contact`, `/about`, `/umra`. Not `./index.html` etc.
- Remove the `dm_dont_rewrite_url`, `file`, and numeric `id` attributes — Duda export artifacts with no function.

Move the footer into `src/components/Footer.astro` verbatim, with:
- The Duda CDN favicon/icon reference replaced by a local `/img/` asset.
- Social links: use the real URLs supplied by the client. **If they have not been supplied, omit the social icons entirely rather than shipping `facebook.com/` placeholders.** Flag this in the task report.
- Business hours: Mon–Fri 9–6, Sat 10–5.

Move the not-a-law-firm text into `src/components/Disclaimer.astro`.

`src/layouts/BaseLayout.astro`:

```astro
---
import Footer from '../components/Footer.astro';
import Nav from '../components/Nav.astro';

interface Props {
  title: string;
  description: string;
  canonical: string;
}

const { title, description, canonical } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/img/favicon.ico" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cardo&family=Catamaran:wght@200;400;600;700&family=Prata&family=Raleway:wght@300;500;600;700&display=swap"
    />
    <link rel="stylesheet" href="/css/style.css" />
    <slot name="head" />
  </head>
  <body>
    <Nav />
    <slot />
    <Footer />
  </body>
</html>
```

Note: no `ga.js`. The dead analytics script is dropped here and Cloudflare Web Analytics is added in Task 10.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/ public/css/ public/img/
git commit -m "feat: add base layout with shared nav, footer, and disclaimer"
```

---

### Task 5: ConsultForm component

Replaces six copies of hand-written form markup and the broken submit handler.

**Files:**
- Create: `src/components/ConsultForm.astro`
- Reference: `contact.html:237-265` (markup), `contact.html:460-472` (the broken handler)

**Interfaces:**
- Consumes: `POST /api/contact` (Task 3)
- Produces: `ConsultForm` accepting props `{ subject: string; formId: string }`

- [ ] **Step 1: Write the component**

`src/components/ConsultForm.astro`:

```astro
---
interface Props {
  subject: string;
  formId: string;
}

const { subject, formId } = Astro.props;
const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
---

<form class="form" id={formId} novalidate>
  <div class="form__group">
    <label class="form__label" for={`${formId}-name`}>Name</label>
    <input class="form__input input-information" type="text" id={`${formId}-name`}
           name="name" maxlength="100" required />
  </div>
  <div class="form__group">
    <label class="form__label" for={`${formId}-email`}>Email</label>
    <input class="form__input input-information" type="email" id={`${formId}-email`}
           name="email" maxlength="254" required />
  </div>
  <div class="form__group">
    <label class="form__label" for={`${formId}-phone`}>Phone</label>
    <input class="form__input input-information" type="tel" id={`${formId}-phone`}
           name="phone" maxlength="40" required />
  </div>
  <div class="form__group">
    <label class="form__label" for={`${formId}-message`}>Message</label>
    <textarea class="form__input input-information" id={`${formId}-message`}
              name="message" maxlength="5000" style="height: 50px;" spellcheck="false"></textarea>
  </div>

  <input type="hidden" name="subject" value={subject} />

  {/* Honeypot: hidden from humans, irresistible to bots. */}
  <div class="form__hp" aria-hidden="true">
    <label for={`${formId}-website`}>Leave this field empty</label>
    <input type="text" id={`${formId}-website`} name="website" tabindex="-1" autocomplete="off" />
  </div>

  <div class="cf-turnstile" data-sitekey={turnstileSiteKey}></div>

  <p class="form__error" role="alert" hidden></p>

  <div class="form__group">
    <button type="submit" class="btn btn--blue">Send Message</button>
  </div>
</form>

<style>
  .form__hp {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
</style>

<script>
  document.querySelectorAll<HTMLFormElement>('form.form').forEach((form) => {
    const errorEl = form.querySelector<HTMLElement>('.form__error');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (errorEl) errorEl.hidden = true;
      if (button) button.disabled = true;

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          body: new FormData(form),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        form.innerHTML =
          '<h1 class="success-message">Thank you for contacting us.<br/>' +
          'We will get back to you as soon as possible</h1>';
      } catch (error) {
        console.error('Contact form submission failed', {
          formId: form.id,
          message: error instanceof Error ? error.message : String(error),
        });
        if (errorEl) {
          errorEl.textContent =
            'Sorry, we could not send your message. Please call us at (612) 822-5747.';
          errorEl.hidden = false;
        }
        if (button) button.disabled = false;
      }
    });
  });
</script>
```

Three deliberate differences from the old code:
1. `response.ok` is checked. The success message renders only on real success.
2. Failure surfaces an error with a phone fallback instead of a false thank-you.
3. The old copy said "You will get back to you" — a typo. Corrected to "We will get back to you". This is a copy fix, not a redesign; note it in the task report.

- [ ] **Step 2: Add the Turnstile script to BaseLayout**

In `src/layouts/BaseLayout.astro`, inside `<head>`, after the stylesheet link:

```astro
    <script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js"
      async
      defer
      is:inline></script>
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/ConsultForm.astro src/layouts/BaseLayout.astro
git commit -m "fix: replace silently-failing forms with a single validated component"
```

---

### Task 6: Map component (Leaflet + OpenStreetMap)

Removes the committed Google Maps key and the `api=1` bug in one move.

**Files:**
- Create: `src/components/Map.astro`
- Delete: `map.js`
- Reference: `map.js` (for the coordinates and info-window content)

**Interfaces:**
- Consumes: nothing
- Produces: `Map` component, no props. Renders `#map`.

- [ ] **Step 1: Add Leaflet as a pinned dependency**

Run: `npm install leaflet@1.9.4 && npm install -D @types/leaflet@1.9.12`

Pinned exactly. The old site loaded Swiper from `unpkg.com/swiper/` unpinned, which is a supply-chain risk we are not repeating.

- [ ] **Step 2: Write the component**

`src/components/Map.astro`:

```astro
---
import 'leaflet/dist/leaflet.css';
---

<div id="map" style="height: 400px;"></div>

<script>
  import L from 'leaflet';

  const OFFICE: [number, number] = [44.948306738076035, -93.27877182892344];
  const ADDRESS = '1 W Lake St suite #165, Minneapolis, MN 55408, United States';

  const mapEl = document.getElementById('map');
  if (mapEl) {
    const map = L.map(mapEl).setView(OFFICE, 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const icon = L.icon({
      iconUrl: '/img/marker-icon.png',
      iconRetinaUrl: '/img/marker-icon-2x.png',
      shadowUrl: '/img/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const directionsUrl =
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`;

    L.marker(OFFICE, { icon })
      .addTo(map)
      .bindPopup(
        `<div class="store-info-window">
           <div class="store-info-name">Immigrant Resource Center</div>
           <div class="store-info-status">Mon&ndash;Fri 9AM&ndash;6PM<br/>Sat 10AM&ndash;5PM</div>
           <a class="portal" href="${directionsUrl}" target="_blank" rel="noopener noreferrer">
             <div class="store-info-address">${ADDRESS}</div>
           </a>
           <div class="store-info-phone">
             <a href="tel:+16128225747"><b>(612) 822-5747</b></a>
           </div>
         </div>`,
      );
  }
</script>
```

Four fixes from the old `map.js`, all of which should be noted in the task report:
1. No API key exists to leak.
2. `api=1` is the literal Google expects — the directions link works now, and the key is not pasted into a URL.
3. Hours corrected to match the live site (the old file claimed "9AM TO 6PM (Except Sunday)", which is wrong).
4. The info window previously hotlinked two icons from a stranger's Webflow CDN (`uploads-ssl.webflow.com`). Dropped.

- [ ] **Step 3: Delete the old map**

```bash
git rm map.js
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 5: Grep to prove the key is gone from the working tree**

Run: `grep -r "AIzaSy" --include="*.ts" --include="*.astro" --include="*.js" --include="*.html" . || echo "CLEAN"`
Expected: `CLEAN`

The key remains in git history. Rotating/deleting it in the Google Cloud console is a runbook item, not a code change — flag it in the task report.

- [ ] **Step 6: Commit**

```bash
git add src/components/Map.astro package.json package-lock.json
git commit -m "feat: replace Google Maps with Leaflet+OSM, removing the committed API key"
```

---

### Task 7: Port the homepage

**Files:**
- Create: `src/pages/index.astro`
- Reference: `index.html`

**Interfaces:**
- Consumes: `BaseLayout` (Task 4), `ConsultForm` (Task 5), `Map` (Task 6), `Disclaimer` (Task 4)
- Produces: `/` route

- [ ] **Step 1: Port the page**

Create `src/pages/index.astro` using `BaseLayout`. Move the body content of `index.html` into it, minus the nav and footer (now components) and minus the two inline `<form>` blocks (now `ConsultForm`).

`index.html` has two forms: `form-consultation` (line 214) and `form-booking` (line 669). Replace them with:

```astro
<ConsultForm subject="Consultation" formId="form__consultation" />
```

```astro
<ConsultForm subject="Booking" formId="form__booking" />
```

Frontmatter:

```astro
---
import ConsultForm from '../components/ConsultForm.astro';
import Disclaimer from '../components/Disclaimer.astro';
import Map from '../components/Map.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title="Immigrant Resource Center | Immigration & Travel Services in Minneapolis"
  description="Immigration and travel services in Minneapolis. Green card, citizenship, and visa application assistance."
  canonical="https://www.ircoffice.com/"
>
```

Keep the GSAP tags for now — `animation.js` depends on them and the tab rewrite is Task 8. Pin the version rather than leaving it floating.

- [ ] **Step 2: Build and eyeball against live**

Run: `npm run build && npm run dev`
Open `http://localhost:4321/` beside `https://www.ircoffice.com/`. Section order and content must match. Task 12 makes this a real automated check; this step is a sanity pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: port homepage to Astro"
```

---

### Task 8: Remove the CDN script dependencies (jQuery, GSAP, Swiper)

This task closes the site's third-party script supply chain. Three separate problems, one deliverable: jQuery 1.12.4 is vulnerable and gets deleted outright; GSAP and Swiper are legitimate but are loaded from CDNs and get vendored via npm.

**Why vendoring rather than Subresource Integrity:** SRI only helps on pinned, immutable URLs. GSAP at `cdnjs/3.5.1` qualifies — but vendoring is strictly better, because it removes the CDN from the trust path entirely rather than merely detecting a compromise. Swiper is worse: it is loaded from `unpkg.com/swiper/` with **no version at all**, so the site executes whatever was published most recently. That is a live supply-chain exposure, and no hash can pin a moving target.

SRI is deliberately **not** applied to `challenges.cloudflare.com/turnstile/v0/api.js` or `static.cloudflareinsights.com/beacon.min.js`. Those are versionless rotating loaders that Cloudflare updates in place; a pinned hash would break Turnstile and analytics the next time Cloudflare ships. Their mitigation is the CSP `script-src` allowlist in Task 12. If a reviewer or tooling flags these as missing SRI, this paragraph is the answer.

**Files:**
- Create: `src/components/Tabs.astro`
- Delete: `jquery.flextabs.js`
- Modify: `src/layouts/BaseLayout.astro`, `src/pages/index.astro`
- Reference: `jquery.flextabs.js`, and the `#tab-1`..`#tab-4` markup in `index.html`

**Interfaces:**
- Consumes: nothing
- Produces: `Tabs` component wrapping tab markup via `<slot />`; `gsap` and `swiper` importable from npm

- [ ] **Step 1: Write the failing E2E test**

`tests/e2e/tabs.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

test.describe('service tabs', () => {
  test('shows the first tab by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tab-1')).toBeVisible();
    await expect(page.locator('#tab-2')).toBeHidden();
  });

  test('switches panels on click', async ({ page }) => {
    await page.goto('/');
    await page.click('[href="#tab-2"]');
    await expect(page.locator('#tab-2')).toBeVisible();
    await expect(page.locator('#tab-1')).toBeHidden();
  });

  test('is keyboard operable', async ({ page }) => {
    await page.goto('/');
    await page.locator('[href="#tab-2"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tab-2')).toBeVisible();
  });
});
```

The keyboard test is new behaviour, not a port. The jQuery plugin bound click only.

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/e2e/tabs.spec.ts`
Expected: FAIL

- [ ] **Step 3: Write the component**

`src/components/Tabs.astro`:

```astro
<div class="flextabs">
  <slot />
</div>

<script>
  document.querySelectorAll<HTMLElement>('.flextabs').forEach((container) => {
    const triggers = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('.flextabs__toggle'),
    );
    const panels = triggers
      .map((t) => document.querySelector<HTMLElement>(t.getAttribute('href') ?? ''))
      .filter((p): p is HTMLElement => p !== null);

    function activate(index: number): void {
      panels.forEach((panel, i) => {
        panel.hidden = i !== index;
      });
      triggers.forEach((trigger, i) => {
        trigger.classList.toggle('flextabs__toggle--active', i === index);
        trigger.setAttribute('aria-selected', String(i === index));
      });
    }

    triggers.forEach((trigger, index) => {
      trigger.setAttribute('role', 'tab');
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        activate(index);
      });
    });

    if (triggers.length > 0) activate(0);
  });
</script>
```

- [ ] **Step 4: Remove jQuery**

Delete the `<script src="https://code.jquery.com/jquery-1.12.4.min.js">` tag and the `jquery.flextabs.js` tag from every page that references them.

```bash
git rm jquery.flextabs.js
```

- [ ] **Step 5: Vendor GSAP and Swiper via npm**

Run: `npm install gsap@3.5.1 swiper@11.1.14`

GSAP is pinned to 3.5.1 — the exact version the CDN tags requested — so animation behaviour is unchanged. Swiper had no version pinned anywhere, so 11.1.14 is a deliberate choice; verify the carousels still behave and note any API differences in the task report.

Remove these tags from `src/layouts/BaseLayout.astro` and `src/pages/index.astro`:

```
https://cdnjs.cloudflare.com/ajax/libs/gsap/3.5.1/gsap.min.js
https://cdnjs.cloudflare.com/ajax/libs/gsap/3.5.1/ScrollTrigger.min.js
https://unpkg.com/swiper/swiper-bundle.min.js
https://unpkg.com/swiper/swiper-bundle.min.css
```

Also remove the three form polyfills — `formdata-polyfill`, `fetch-polyfill`, `promise-polyfill`. They exist to support browsers that predate `fetch` and `FormData`; every browser Astro targets has both natively. They are three unnecessary CDN calls in the critical path.

Move `animation.js` to `src/scripts/animation.ts` and convert its implicit globals to imports at the top:

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
```

The rest of the file's animation logic is unchanged. Note that `animation.js` currently also contains the nav-toggle code and calls `allEventListners()` at module scope against elements that do not exist on every page — that is why it throws on pages without a `.nav-toggler`. Move the nav-toggle code into `Nav.astro` where it belongs, and guard the lookups.

Then import it from `BaseLayout.astro`:

```astro
<script>
  import '../scripts/animation';
</script>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx playwright test tests/e2e/tabs.spec.ts`
Expected: PASS — 3 tests pass

- [ ] **Step 7: Prove the CDN scripts are gone**

Run: `grep -ri "jquery\|cdnjs.cloudflare\|unpkg.com\|jsdelivr" src/ public/ --include="*.astro" --include="*.js" --include="*.ts" || echo "CLEAN"`
Expected: `CLEAN`

Only `challenges.cloudflare.com` and `static.cloudflareinsights.com` may remain as external scripts, and both are covered by the CSP as explained above.

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: build succeeds; GSAP and Swiper are bundled into `dist/_astro/`

- [ ] **Step 9: Commit**

```bash
git add src/components/Tabs.astro src/scripts/animation.ts src/layouts/BaseLayout.astro \
        src/pages/index.astro tests/e2e/tabs.spec.ts package.json package-lock.json
git commit -m "refactor: remove jQuery and vendor GSAP/Swiper, dropping all CDN scripts"
```

---

### Task 9: Port green-card, visa, citizenship, and contact pages

**Files:**
- Create: `src/pages/green-card.astro`, `src/pages/visa.astro`, `src/pages/citizenship.astro`, `src/pages/contact.astro`
- Reference: `greencard.html`, `visa.html`, `citizenship.html`, `contact.html`

**Interfaces:**
- Consumes: `BaseLayout`, `ConsultForm`, `Map`, `Disclaimer`, `Tabs`
- Produces: `/green-card`, `/visa`, `/citizenship`, `/contact` routes

- [ ] **Step 1: Port each page**

Same shape as Task 7, one page at a time. Form replacements:

| Legacy file | Legacy form | Replacement |
|---|---|---|
| `greencard.html:197` | `form-greencard` | `<ConsultForm subject="Green Card" formId="form__greencard" />` |
| `visa.html:195` | `form-visa` | `<ConsultForm subject="Visa" formId="form__visa" />` |
| `citizenship.html:200` | `form-citizenship` | `<ConsultForm subject="Citizenship" formId="form__citizenship" />` |
| `contact.html:237` | `form-contact` | `<ConsultForm subject="Contact" formId="form__contact" />` |

`contact.html` also hosts the map — use `<Map />`.

Per-page `BaseLayout` props:

```astro
<!-- green-card.astro -->
title="Green Card Services | Immigrant Resource Center"
description="Green card application assistance in Minneapolis. Family-based, employment-based, and adjustment of status support."
canonical="https://www.ircoffice.com/green-card"

<!-- visa.astro -->
title="Visa Services | Immigrant Resource Center"
description="Visa application assistance in Minneapolis, including visitor, fiancé(e), and family visas."
canonical="https://www.ircoffice.com/visa"

<!-- citizenship.astro -->
title="Citizenship & Naturalization | Immigrant Resource Center"
description="Citizenship and naturalization application assistance in Minneapolis."
canonical="https://www.ircoffice.com/citizenship"

<!-- contact.astro -->
title="Contact Us | Immigrant Resource Center"
description="Contact the Immigrant Resource Center in Minneapolis. Call (612) 822-5747 or send us a message."
canonical="https://www.ircoffice.com/contact"
```

Descriptions are informational and describe services offered. Do not write copy that reads as legal advice or implies attorney representation — IRC is a non-attorney practice and that boundary is legally load-bearing.

- [ ] **Step 2: Delete the legacy HTML**

```bash
git rm index.html greencard.html visa.html citizenship.html contact.html
git rm ace-responsive-menu.js ace-responsive-menu.css
```

Check whether `animation.js` is still referenced. If yes, move it to `public/`; if not, `git rm` it.

- [ ] **Step 3: Verify every route builds**

Run: `npm run build && ls dist/`
Expected: `index.html`, `green-card.html`, `visa.html`, `citizenship.html`, `contact.html`

- [ ] **Step 4: Commit**

```bash
git add src/pages/
git commit -m "feat: port green-card, visa, citizenship, and contact pages to Astro"
```

---

### Task 10: New pages — about, umra, privacy

**Files:**
- Create: `src/pages/about.astro`, `src/pages/umra.astro`, `src/pages/privacy.astro`

**Interfaces:**
- Consumes: `BaseLayout`, `ConsultForm`, `Disclaimer`
- Produces: `/about`, `/umra`, `/privacy` routes

- [ ] **Step 1: Fetch the live content**

These pages do not exist in the recreation. Fetch each live page and reproduce its content faithfully:
- `https://www.ircoffice.com/about`
- `https://www.ircoffice.com/umra`
- `https://www.ircoffice.com/privacy`

`/umra` covers Umrah 2020 packages: Umra Visa, Ticket & Accommodation, One Year Health Insurance. It has a contact form — use `<ConsultForm subject="Umra" formId="form__umra" />`.

Note in the task report that the live `/umra` page references "Umra 2020" and links a 2020 coronavirus news article. It is stale. Reproduce it faithfully for the cutover (pixel-match is the bar) but flag the staleness for the client — do not silently rewrite it.

- [ ] **Step 2: Write the privacy policy accurately**

The privacy page must describe what this site actually does, not a generic template:
- The contact form collects name, email, phone, and message, and delivers them by email to IRC.
- Cloudflare Web Analytics is cookieless and collects no personal data.
- Cloudflare Turnstile is used for spam prevention.
- The site sets no advertising or tracking cookies.

Do not claim practices the site does not have. An inaccurate privacy policy is worse than a thin one.

- [ ] **Step 3: Verify the build**

Run: `npm run build && ls dist/`
Expected: `about.html`, `umra.html`, `privacy.html` present

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro src/pages/umra.astro src/pages/privacy.astro
git commit -m "feat: add about, umra, and privacy pages"
```

---

### Task 11: Blog

Ships empty and ready. No posts at launch.

**Files:**
- Create: `src/content.config.ts`, `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, `src/layouts/PostLayout.astro`, `src/content/blog/.gitkeep`
- Test: `tests/unit/blog-collection.test.ts`

**Interfaces:**
- Consumes: `BaseLayout`
- Produces: `/blog` and `/blog/<slug>` routes; a `blog` content collection with schema `{ title: string; description: string; pubDate: Date; draft: boolean }`

- [ ] **Step 1: Write the failing test**

`tests/unit/blog-collection.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { blogSchema } from '../../src/content.config';

describe('blogSchema', () => {
  it('accepts a valid post', () => {
    const result = blogSchema.safeParse({
      title: 'Understanding the naturalization timeline',
      description: 'What to expect and when.',
      pubDate: new Date('2026-08-01'),
      draft: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults draft to false', () => {
    const result = blogSchema.safeParse({
      title: 'A post',
      description: 'A description.',
      pubDate: new Date('2026-08-01'),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.draft).toBe(false);
  });

  it('rejects a post with no title', () => {
    const result = blogSchema.safeParse({
      description: 'A description.',
      pubDate: new Date('2026-08-01'),
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/blog-collection.test.ts`
Expected: FAIL — cannot resolve `src/content.config`

- [ ] **Step 3: Write the config**

`src/content.config.ts`:

```typescript
import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

export const blogSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  pubDate: z.coerce.date(),
  draft: z.boolean().default(false),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: blogSchema,
});

export const collections = { blog };
```

- [ ] **Step 4: Write the routes**

`src/pages/blog/index.astro`:

```astro
---
import { getCollection } from 'astro:content';

import BaseLayout from '../../layouts/BaseLayout.astro';

const posts = (await getCollection('blog', ({ data }) => data.draft === false)).sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
);
---

<BaseLayout
  title="Blog | Immigrant Resource Center"
  description="News and information from the Immigrant Resource Center in Minneapolis."
  canonical="https://www.ircoffice.com/blog"
>
  <main class="blog-index">
    <h1>Blog</h1>
    {posts.length === 0 && <p>Posts are coming soon.</p>}
    <ul>
      {
        posts.map((post) => (
          <li>
            <a href={`/blog/${post.id}`}>{post.data.title}</a>
            <time datetime={post.data.pubDate.toISOString()}>
              {post.data.pubDate.toLocaleDateString('en-US')}
            </time>
            <p>{post.data.description}</p>
          </li>
        ))
      }
    </ul>
  </main>
</BaseLayout>
```

`src/pages/blog/[slug].astro`:

```astro
---
import { getCollection, render } from 'astro:content';

import BaseLayout from '../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.draft === false);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<BaseLayout
  title={`${post.data.title} | Immigrant Resource Center`}
  description={post.data.description}
  canonical={`https://www.ircoffice.com/blog/${post.id}`}
>
  <main class="blog-post">
    <h1>{post.data.title}</h1>
    <time datetime={post.data.pubDate.toISOString()}>
      {post.data.pubDate.toLocaleDateString('en-US')}
    </time>
    <Content />
  </main>
</BaseLayout>
```

`getStaticPaths` over a `draft === false` filter means drafts never render — they cannot leak to production by accident.

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run tests/unit/blog-collection.test.ts && npm run build`
Expected: tests PASS; build succeeds with `/blog` rendering the empty state

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/pages/blog/ src/layouts/PostLayout.astro \
        src/content/blog/.gitkeep tests/unit/blog-collection.test.ts
git commit -m "feat: add blog with content collection, empty at launch"
```

---

### Task 12: Redirects, security headers, sitemap, analytics

**Files:**
- Create: `public/_redirects`, `public/_headers`, `public/robots.txt`
- Modify: `astro.config.mjs`, `src/layouts/BaseLayout.astro`
- Test: `tests/e2e/redirects.spec.ts`

**Interfaces:**
- Consumes: all page routes
- Produces: 301s for every legacy URL; security headers; `/sitemap-index.xml`

- [ ] **Step 1: Write the failing test**

`tests/e2e/redirects.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npx playwright test tests/e2e/redirects.spec.ts`
Expected: FAIL — redirects not configured

- [ ] **Step 3: Write the redirects**

`public/_redirects`:

```
/index.html            /              301
/greencard.html        /green-card    301
/visa.html             /visa          301
/citizenship.html      /citizenship   301
/contact.html          /contact       301
/green-card66789dc8    /green-card    301
/citizhenship          /citizenship   301
```

`/citizhenship` is a Duda typo page and `/green-card66789dc8` is a Duda-generated duplicate. Both are in the live sitemap, so both may have inbound links. 301 rather than 404.

- [ ] **Step 4: Write the security headers**

`public/_headers`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self' https://cloudflareinsights.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

Notes on this policy, each deliberate:

- `script-src` allowlists only Turnstile and Cloudflare Insights. `cdnjs`, `unpkg`, `jsdelivr`, and `code.jquery.com` are all absent because Task 8 vendored or deleted every script that came from them. If the build still needs one of those hosts, Task 8 is incomplete — widen Task 8, not this policy.
- `img-src` allowlists OSM tiles and nothing else. No `multiscreensite.com` — that is the point of the migration.
- `form-action 'self'` means a submitted form cannot POST anywhere but this origin.
- `'unsafe-inline'` on `script-src` is still required: Astro emits some inline bootstrapping, and the component `<script>` blocks are inlined at build time. Tightening this to a nonce or hash is real follow-up work but is not launch-blocking. Flag it in the task report rather than silently leaving it.

Verify the policy does not break the site before committing — an over-tight CSP fails silently in the console rather than loudly in the build:

Run: `npm run build && npx wrangler pages dev dist --port 8788`, load each route, and confirm the browser console reports zero CSP violations.

- [ ] **Step 5: Add the sitemap integration**

Run: `npm install @astrojs/sitemap@^3.2.0`

In `astro.config.mjs`:

```javascript
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.ircoffice.com',
  output: 'static',
  build: {
    format: 'file',
  },
  integrations: [sitemap()],
});
```

`public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://www.ircoffice.com/sitemap-index.xml
```

- [ ] **Step 6: Add Cloudflare Web Analytics**

In `src/layouts/BaseLayout.astro`, immediately before `</body>`:

```astro
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${import.meta.env.PUBLIC_CF_BEACON_TOKEN}"}`}
      is:inline></script>
```

Cookieless — no consent banner required, which is why it was chosen over GA4.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run build && npx wrangler pages dev dist --port 8788` in one shell, then:
Run: `npx playwright test tests/e2e/redirects.spec.ts`
Expected: PASS — all redirects 301 and all 9 routes 200

- [ ] **Step 8: Commit**

```bash
git add public/_redirects public/_headers public/robots.txt astro.config.mjs \
        src/layouts/BaseLayout.astro tests/e2e/redirects.spec.ts package.json
git commit -m "feat: add redirects, security headers, sitemap, and analytics"
```

---

### Task 13: Visual regression against the live site

Makes "pixel-match" a checkable claim rather than an opinion.

**Files:**
- Create: `playwright.config.ts`, `tests/visual/compare-live.spec.ts`, `scripts/capture-live.ts`

**Interfaces:**
- Consumes: all routes
- Produces: baseline screenshots under `tests/visual/baseline/`; a diff report

- [ ] **Step 1: Write the Playwright config**

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8788',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

- [ ] **Step 2: Write the capture script**

`scripts/capture-live.ts` captures full-page screenshots of the live Duda site into `tests/visual/baseline/<route>-<project>.png`. Route map (live path → baseline name):

```typescript
const ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['/', 'home'],
  ['/green-card', 'green-card'],
  ['/visa', 'visa'],
  ['/citizenship', 'citizenship'],
  ['/contact', 'contact'],
  ['/about', 'about'],
  ['/umra', 'umra'],
  ['/privacy', 'privacy'],
  ['/blog', 'blog'],
];
```

Run it once against `https://www.ircoffice.com` and commit the baselines. Capture before the cutover — after Duda is cancelled the reference is gone forever.

- [ ] **Step 3: Write the comparison test**

`tests/visual/compare-live.spec.ts` navigates each route on the local preview and asserts against the baseline with `toHaveScreenshot({ maxDiffPixelRatio: 0.02 })`.

A 2% tolerance is deliberate. Font rendering, the map tile source, and animation timing will never match byte-for-byte, and a 0% threshold would produce noise that gets ignored — which is worse than no test.

- [ ] **Step 4: Run the comparison**

Run: `npx playwright test tests/visual/`
Expected: differences reported per route. Triage each: real regressions get fixed; known-acceptable ones (map tiles, fonts) get documented in the task report.

Do **not** blanket-raise the threshold to force a pass. If a route genuinely cannot match, say so and explain why.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/visual/ scripts/capture-live.ts
git commit -m "test: add visual regression harness against the live site"
```

---

### Task 14: Link checker and final verification

**Files:**
- Create: `tests/e2e/links.spec.ts`

**Interfaces:**
- Consumes: all routes
- Produces: a passing full suite

- [ ] **Step 1: Write the test**

`tests/e2e/links.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

const ROUTES = [
  '/', '/green-card', '/visa', '/citizenship',
  '/contact', '/about', '/umra', '/privacy', '/blog',
];

test('no internal link 404s', async ({ page, request }) => {
  const checked = new Set<string>();
  const broken: string[] = [];

  for (const route of ROUTES) {
    await page.goto(route);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).getAttribute('href') ?? ''),
    );

    for (const href of hrefs) {
      const target = href.split('#')[0];
      if (!target || checked.has(target)) continue;
      checked.add(target);
      const response = await request.get(target, { maxRedirects: 5 });
      if (response.status() >= 400) broken.push(`${target} (${response.status()}) on ${route}`);
    }
  }

  expect(broken, `Broken internal links:\n${broken.join('\n')}`).toHaveLength(0);
});

test('no placeholder social links survive', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href]').evaluateAll((links) =>
    links.map((l) => (l as HTMLAnchorElement).href),
  );

  const placeholders = hrefs.filter((h) =>
    /^https?:\/\/(www\.)?(facebook|twitter|yelp)\.com\/?$/.test(h) ||
    /^https?:\/\/(www\.)?yelp\.com\/biz\/?$/.test(h) ||
    /web\.whatsapp\.com\/send\?phone=$/.test(h),
  );

  expect(placeholders, `Placeholder links still present: ${placeholders.join(', ')}`).toHaveLength(0);
});

test('no Duda CDN references survive', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const duda = requests.filter((u) => u.includes('multiscreensite.com'));
  expect(duda, `Still calling Duda: ${duda.join(', ')}`).toHaveLength(0);
});

test('the legal disclaimer appears on every page', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(
      page.getByText(/not a law firm/i),
      `Disclaimer missing on ${route}`,
    ).toBeVisible();
  }
});
```

The Duda test is the migration's own tripwire: it fails if anything still depends on the platform we are leaving. The disclaimer test guards a legal requirement, so it runs on every route rather than one.

- [ ] **Step 2: Run the full suite**

Run: `npm run build && npx wrangler pages dev dist --port 8788` in one shell, then:
Run: `npm test && npx playwright test && npx tsc --noEmit`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/links.spec.ts
git commit -m "test: add link checker and migration tripwire tests"
```

---

## Deployment prerequisites (not code — do not attempt in these tasks)

Blocking deploy, not development:

1. **Cloudflare Pages project** created and connected to this repo.
2. **KV namespace** `RATE_LIMIT` created and bound to the Pages project.
3. **Environment variables** set in Cloudflare: `RESEND_API_KEY`, `CONTACT_RECIPIENT`, `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_CF_BEACON_TOKEN`.
4. **Resend domain verification** for `send.ircoffice.com` (SPF + DKIM on the subdomain).
5. **Turnstile site** created; site key and secret recorded.
6. **The old Google Maps API key** deleted in the Google Cloud console. It is in git history; removing it from the working tree is not sufficient.
7. **Client inputs:** `CONTACT_RECIPIENT` address; real social URLs (or confirmation to drop them); business-hours confirmation.

DNS work — SPF/DKIM/DMARC and the nameserver cutover — is in `docs/superpowers/runbooks/` and is executed by a human with console access. Do not attempt it from this plan.

## Self-review notes

**Spec coverage:** Workstream 1 → Tasks 1, 4, 7, 9. Workstream 2 → Tasks 10, 11. Workstream 3 → Tasks 2, 3, 5. Workstreams 0 and 4 are DNS-only and are deliberately out of scope here (runbooks). Defects 1→Tasks 3/5, 2→Task 6, 3→Task 6, 4→Task 14 (tripwire), 5→Task 12, 6→Task 14, 7→Task 8, 8→Task 6, 9→Tasks 4/6. Testing section → Tasks 13, 14.

**Type consistency:** `ContactSubmission`, `ValidationResult`, `validateSubmission`, `hasHeaderInjection`, `FIELD_LIMITS` (Task 2) are consumed with identical names in Tasks 3 and 5. `buildEmail` (Task 3) returns `{ subject, text }` and is used as such. `blogSchema` (Task 11) is exported from `src/content.config.ts` and imported under that name by its test.
