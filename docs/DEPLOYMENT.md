# ircoffice.com — deployment runbook

The site build is complete and tested. Everything below is **infrastructure that has to be
created and connected**; none of it can be done from the repo alone.

Do the phases in order. Phase 0 is independent of the migration and should ship first — it
closes a live security hole and is a prerequisite for Resend working at all.

---

## Phase 0 — Email authentication (GoDaddy DNS, no site changes)

`ircoffice.com` currently has **zero TXT records**: no SPF, no DKIM, no DMARC. Two consequences:

1. Anyone can send mail that appears to come from `@ircoffice.com`, and receiving servers have
   nothing to check it against. For a practice whose clients discuss passport numbers, A-numbers
   and SSNs, that is the highest-severity issue in this project. It exists **today**, independent
   of the migration.
2. Resend cannot deliver reliably to a domain with no sender authentication.

Steps, at GoDaddy DNS (nothing here touches the website):

1. **SPF** — add TXT at `@`:
   `v=spf1 include:_spf.google.com ~all`
2. **DKIM** — Google Admin → Apps → Google Workspace → Gmail → Authenticate email. Generate the
   key, then publish the `google._domainkey` TXT record it gives you.
3. **DMARC** — create a deliverable `dmarc@ircoffice.com` mailbox **first**, then add TXT at
   `_dmarc`:
   `v=DMARC1; p=none; rua=mailto:dmarc@ircoffice.com`

> **Start DMARC at `p=none`.** Going straight to `p=reject` on a domain with unknown legitimate
> senders will blackhole real client mail. Read the aggregate reports for ~2 weeks, confirm every
> legitimate sender passes, then tighten `p=none` → `p=quarantine` → `p=reject`.

Verify:

```bash
dig +short TXT ircoffice.com          # expect the SPF record
dig +short TXT google._domainkey.ircoffice.com
dig +short TXT _dmarc.ircoffice.com
```

---

## Phase 1 — Revoke the exposed Google Maps key

The old `map.js` committed an unrestricted browser key (`AIzaSy…`). The current site does not use
Google Maps at all (it uses Leaflet + OpenStreetMap), and the key is gone from the working tree —
but **it is still in git history and must be assumed compromised**.

In Google Cloud Console → APIs & Services → Credentials: **delete** that key. An unrestricted
browser key is billable by anyone who copies it.

---

## Phase 2 — Resend

1. Create the Resend account.
2. Add and verify the sending domain **`send.ircoffice.com`** (a subdomain, deliberately — it
   isolates Resend's sending reputation from Google Workspace mail on the root domain, and keeps
   the root SPF clear of the 10-lookup limit).
3. Publish the SPF/DKIM records Resend gives you **for that subdomain only**. Do not modify the
   root-domain SPF from Phase 0.
4. Create an API key.

The sender address is hardcoded in `functions/api/contact.ts` as
`IRC Website <noreply@send.ircoffice.com>`. If you verify a different domain, change `SENDER`
there to match, or Resend will reject every send with a 502.

---

## Phase 3 — Turnstile

Cloudflare dashboard → Turnstile → add a widget for `ircoffice.com`. You get a **site key**
(public, compiled into the HTML) and a **secret key** (server-side).

`.env.example` currently ships Cloudflare's always-passes **test** site key
(`1x00000000000000000000AA`). Real keys must be set in Phase 4 or the form will not be protected.

---

## Phase 4 — Cloudflare Pages

1. Connect the git repository. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
2. **Create the KV namespace and bind it** (required — see note below):
   ```bash
   npx wrangler kv namespace create RATE_LIMIT
   ```
   Put the returned id into `wrangler.toml` under `[[kv_namespaces]]`.
3. Set **secrets** (never in git):
   - `RESEND_API_KEY`
   - `CONTACT_RECIPIENT` — the inbox that receives leads. This is a server-side constant and is
     never read from the request; that is what stops the endpoint being used as an open relay.
   - `TURNSTILE_SECRET_KEY`
4. Set **build-time public vars**:
   - `PUBLIC_TURNSTILE_SITE_KEY`
   - `PUBLIC_CF_BEACON_TOKEN` (Cloudflare Web Analytics)
5. Deploy to the `*.pages.dev` preview URL. **No DNS changes yet** — the live site and email are
   untouched at this point.

> **On the KV binding:** if `RATE_LIMIT` is unbound the function now degrades to Turnstile-only
> and logs an error, rather than returning 500 on every submission. That guard exists so a
> config mistake cannot silently swallow every lead — but it means a missing binding is *quiet*
> in the UI. Confirm rate limiting is actually live (step 5 of Phase 5).

---

## Phase 5 — Test on the preview URL, before any DNS change

This is the first time the contact form is exercised end-to-end against real infrastructure. The
automated tests cover the handler's logic with a mocked KV; they cannot prove the deployment
wiring. **Do not skip this.**

1. Submit the contact form on the preview URL. Confirm the email arrives at `CONTACT_RECIPIENT`.
2. Confirm **Reply-To** is the submitter's address, so replying reaches the client.
3. Check the email did not land in spam (that is Phase 0 + Phase 2 working).
4. Submit with an invalid email — confirm you see an error and **not** a success message.
   (The original site showed "Thank you" regardless and lost the lead.)
5. Submit 6+ times quickly — the 6th should return 429. If it does not, the KV binding is
   missing; check the Function logs for the `RATE_LIMIT` error.
6. Test every form: home hero, home booking, green-card, visa, citizenship, contact, umra.
7. Check the Function logs for errors.

---

## Phase 6 — DNS cutover (the risky step)

**Google Workspace email must keep working. Sequence this carefully.**

1. **48h before:** lower TTLs at GoDaddy to 300s.
2. In Cloudflare, add the site and let it import DNS. Then **manually verify every record**,
   MX first — all five Google MX records must be present and identical:
   ```
   1  aspmx.l.google.com
   5  alt1.aspmx.l.google.com
   5  alt2.aspmx.l.google.com
   10 alt3.aspmx.l.google.com
   10 alt4.aspmx.l.google.com
   ```
   Also carry across the Phase 0 TXT records (SPF, DKIM, DMARC) and the Phase 2 subdomain records.
3. **Before switching nameservers**, query Cloudflare's nameservers directly and diff against
   the current live answers:
   ```bash
   dig @<cloudflare-ns> MX  ircoffice.com
   dig @<cloudflare-ns> TXT ircoffice.com
   ```
4. Switch nameservers at GoDaddy to Cloudflare.
5. **Send and receive a real test email both directions** before doing anything else.
6. Point the apex and `www` at the Pages project.
7. **Do not cancel Duda.** Hold it for at least a week (see Phase 7).

---

## Phase 7 — After cutover

1. Verify every redirect returns 301 to the right target (`/greencard.html`, `/visa.html`,
   `/citizenship.html`, `/contact.html`, `/index.html`, `/green-card66789dc8`, `/citizhenship`,
   `/umrah`).
2. Submit the contact form again on the real domain.
3. Submit `https://www.ircoffice.com/sitemap-index.xml` to Google Search Console.
4. Watch DMARC aggregate reports; tighten `p=none` → `quarantine` → `reject` once clean.
5. Confirm Cloudflare Web Analytics is recording.
6. Only after a clean week: cancel Duda.

---

## Still needed from the client

These do not block deploy, but the site ships incomplete without them:

- **Social media URLs** — Facebook, Twitter/X, Yelp, WhatsApp. The links were removed rather than
  shipped pointing at `facebook.com/` etc. Provide real URLs to restore them.
- **Umrah page** — the live page was Lorem ipsum, so the current copy is drafted. It needs a real
  review, including whether packages are currently offered.
- **`dmarc@ircoffice.com`** mailbox (Phase 0).
- Confirm business hours: Mon–Fri 9am–6pm, Sat 10am–5pm.
