# ircoffice.com — Duda Migration Design

**Date:** 2026-07-17
**Status:** Approved
**Author:** Mohamed H (with Claude)

## Purpose

Migrate ircoffice.com off Duda to eliminate hosting cost, without losing search
rankings, inbound leads, or business email. The existing repo contains a partial
static recreation of the Duda site; this design completes it, fixes its defects,
and sequences a safe cutover.

Immigrant Resource Center is a private (non-attorney) immigration and travel
services firm in Minneapolis. Its clients are frequently non-native English
speakers in precarious legal situations who correspond about passport numbers,
A-numbers, and SSNs. That audience raises the stakes on email spoofing, privacy,
and third-party tracking, and those concerns drive several decisions below.

## Current state

### The recreation

Five static HTML pages (`index`, `greencard`, `visa`, `citizenship`, `contact`),
no build system, ~11MB of images. Nav, footer, and form markup are duplicated
across all five files. Dependencies are loaded from CDNs: jQuery 1.12.4, GSAP
3.5.1, Swiper (unpinned), plus three form polyfills.

The design work is substantially complete and is worth preserving. The defects
are in the parts that make it function as a business site.

### Confirmed defects

| # | Defect | Evidence | Impact |
|---|---|---|---|
| 1 | All 6 forms fail silently | No `form-name` hidden input; handler ignores `response.ok` (`contact.html:468`) | Leads are lost while the user sees a success message |
| 2 | Google Maps API key committed | `map.js:8`, and every page's script tag | Unrestricted browser key is billable by anyone |
| 3 | Directions URL malformed | `map.js:19` uses `?api=${GoogleMapApiKey}`; Google expects literal `api=1` | Link broken; key pasted into a URL |
| 4 | Still calling Duda | favicon + icon from `irp-cdn.multiscreensite.com` | Breaks on Duda cancellation |
| 5 | Dead analytics | `ga.js` (Classic Analytics, retired 2019) | Collecting nothing |
| 6 | Placeholder social links | `facebook.com/`, `twitter.com/`, `yelp.com/biz/` (plain http), WhatsApp link with no number | Dead links |
| 7 | Vulnerable jQuery | 1.12.4, known XSS advisories | Only consumer is the flextabs plugin |
| 8 | Unpinned dependency | `unpkg.com/swiper/` resolves to latest | Supply-chain and breakage risk |
| 9 | Business hours disagree | `map.js:14` says "9AM TO 6PM (Except Sunday)"; live says Mon–Fri 9–6, Sat 10–5 | Wrong information published |

### Missing pages

The live sitemap lists pages the recreation does not have: `/about`, `/umra`
(Umrah packages), `/blog` (currently zero posts), `/privacy`. It also contains
Duda-generated junk: `/green-card66789dc8` and `/citizhenship` (typo).

### URL structure mismatch

Live uses clean paths (`/green-card`); the recreation uses `greencard.html`.
Shipping as-is would 404 every existing ranking and inbound link.

### Live DNS (verified against authoritative NS `ns65.domaincontrol.com`)

| Record | Value | Note |
|---|---|---|
| NS | `ns65/ns66.domaincontrol.com` | GoDaddy |
| MX | `aspmx.l.google.com` (+4 alts) | **Google Workspace — live, must be preserved** |
| A | `100.24.208.97`, `35.172.94.1` | Duda |
| www | `s.multiscreensite.com` | Duda |
| TXT | **none** | No SPF |
| `_dmarc` | **none** | No DMARC |
| DKIM | **none** | No selector found |

The domain has **zero TXT records**. SOA serial `2021052801` — DNS untouched
since May 2021.

Two consequences:

1. Adding Resend to a domain with no SPF/DKIM means the mail lands in spam.
   Email authentication is a prerequisite for Resend, not a follow-up.
2. **`ircoffice.com` is spoofable by anyone today.** With no SPF, DKIM, or DMARC,
   a receiving server has nothing to validate an inbound `From: @ircoffice.com`
   against, so forgeries pass by default. This exposure is pre-existing and
   independent of the migration.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Fidelity | Pixel-match the live site | Cut over invisibly, improve from a working baseline afterward |
| Framework | Astro now, not later | Pixel-match needs 4 new pages; in plain HTML that's 9 duplicated copies, then a second rewrite to port. Astro emits identical static HTML |
| Hosting | Cloudflare Pages + Pages Functions | Best free tier, no bandwidth cap, free WAF/DDoS. Vercel's free tier excludes commercial use |
| Email send | Resend, from `send.ircoffice.com` | Subdomain isolates sending reputation from Google Workspace and avoids SPF's 10-lookup limit |
| Lead delivery | Email to a fixed inbox | Recipient is a server constant, never user-controlled |
| Map | Leaflet + OpenStreetMap | No API key, no billing surface, no Google tracking. Leaflet marker assets already in `img/` |
| jQuery | Drop | Removes a vulnerable dep; flextabs is the only consumer |
| Blog | Build for real, ship empty | Astro content collections make it cheap; highest-leverage SEO move available |
| Analytics | Cloudflare Web Analytics | Free, cookieless, no consent banner, privacy-respecting |
| Legacy URLs | 301 all | Preserves link equity, stops 404s |

## Architecture

Astro in static output mode (`output: 'static'`). Output is plain HTML — the same
bytes the browser receives today, authored once instead of nine times.

```
src/
  layouts/BaseLayout.astro      # <head>, meta, analytics, canonical
  components/
    Nav.astro                   # currently duplicated 5x
    Footer.astro
    ConsultForm.astro           # one component, 6 instances, subject via prop
    Map.astro                   # Leaflet + OSM
    Disclaimer.astro            # not-a-law-firm notice
  pages/
    index.astro
    green-card.astro
    visa.astro
    citizenship.astro
    contact.astro
    about.astro                 # new
    umra.astro                  # new
    privacy.astro               # new
    blog/index.astro            # new
    blog/[slug].astro           # new
  content/blog/                 # content collection, empty at launch
functions/
  api/contact.ts                # Pages Function → Resend
public/
  _redirects
  _headers
```

Routes match live exactly. This is what protects rankings.

### Redirect map (`public/_redirects`)

```
/greencard.html            /green-card    301
/visa.html                 /visa          301
/citizenship.html          /citizenship   301
/contact.html              /contact       301
/index.html                /              301
/green-card66789dc8        /green-card    301
/citizhenship              /citizenship   301
```

## Workstreams

Ordered by dependency. Workstream 0 ships independently and immediately.

### 0. Email authentication (GoDaddy DNS, no site changes)

Closes the live spoofing exposure and unblocks Resend. Reversible, touches
nothing else.

1. SPF: `v=spf1 include:_spf.google.com ~all`
2. Enable DKIM in the Google Workspace admin console; publish the
   `google._domainkey` TXT record it generates.
3. DMARC at `p=none` first:
   `v=DMARC1; p=none; rua=mailto:dmarc@ircoffice.com`

**DMARC must start in monitor mode.** Jumping straight to `p=reject` on a domain
with unknown legitimate senders will blackhole real mail. Collect reports for
~2 weeks, confirm all legitimate sources pass, then tighten to `p=quarantine`,
then `p=reject`.

*Prerequisite:* `dmarc@ircoffice.com` must exist and be deliverable in Google
Workspace before the record is published.

### 1. Astro port (no DNS changes — zero risk)

Scaffold the project, extract the shared components, port the five existing
pages, deploy to a `*.pages.dev` preview. The live site and email are untouched
throughout.

### 2. Missing pages

Build `/about`, `/umra`, `/privacy`, `/blog`, pixel-matched against live.

`/privacy` must accurately describe what the site actually collects — contact
form fields, and Cloudflare Web Analytics (cookieless, no personal data). It
should not claim more or less than is true.

### 3. Forms + Resend

The Pages Function is the only place the Resend API key exists. It is never sent
to the browser.

**Security requirements (all mandatory):**

- **Fixed recipient.** The `to:` address is a server-side constant from the
  `CONTACT_RECIPIENT` environment variable. It is never read from the request
  body. This is what prevents the endpoint becoming an open relay.
- **Header-injection safe.** Reject any field reaching an email header (subject,
  reply-to, name) that contains CR or LF.
- **Honeypot.** Hidden field; silently accept-and-discard when filled.
- **Cloudflare Turnstile.** Server-side token verification before send.
- **Rate limiting.** Per-IP, via Cloudflare KV or WAF rules.
- **Server-side validation.** Length caps and type checks on every field.
  Client-side validation is a UX affordance, not a control.
- **Honest responses.** The success message renders only on a real success.
  Failures surface an error and are logged with context. This directly fixes
  defect #1 — the current silent-failure behaviour is the single most costly bug
  in the repo.
- **No secrets in the repo.** `RESEND_API_KEY` and `CONTACT_RECIPIENT` live in
  Cloudflare environment variables.

**Resend domain verification:** `send.ircoffice.com` with its own SPF and DKIM
records. Root-domain SPF for Google Workspace is not modified.

### 4. DNS cutover (the risky step)

Sequenced so that every failure mode is caught before it becomes visible, and so
rollback is fast.

1. Lower TTLs to 300 at GoDaddy, ~48h ahead of the cutover.
2. Replicate **every** record into Cloudflare — MX first. Google Workspace mail
   must survive the move.
3. Verify with `dig @<cloudflare-ns> MX ircoffice.com` **before** touching
   nameservers. Confirm all five MX records resolve identically.
4. Switch nameservers at GoDaddy to Cloudflare.
5. Confirm mail flows in **both** directions with live test messages.
6. Point apex + `www` at Cloudflare Pages.
7. **Do not cancel Duda.** Hold through a verification window (minimum one week).

### 5. Post-cutover

- Verify every redirect resolves 301 to the right target.
- Submit the new sitemap to Google Search Console.
- Monitor DMARC aggregate reports; tighten `p=none` → `quarantine` → `reject`.
- Cancel Duda only after the verification window passes clean.

## Testing

Pixel-match is a claim that should be checked, not eyeballed.

| Layer | Approach |
|---|---|
| Visual fidelity | Playwright screenshots, live vs. preview, 3 viewports, per-page diff |
| Contact function | Unit tests: validation, header injection, honeypot, rate limiting, fixed-recipient enforcement |
| Links | Automated checker over internal links and every redirect |
| SEO/perf | Lighthouse baseline per page |
| DNS | `dig` assertions against Cloudflare NS before nameserver switch |

The contact function tests are the ones that matter most — they cover the defect
that is currently costing the business real leads, and the abuse surface the fix
introduces.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Google Workspace mail breaks during DNS move | **Critical** | MX replicated first, `dig`-verified against CF nameservers before NS switch, bidirectional test mail, low TTL for fast rollback |
| Rankings lost to URL changes | High | Routes match live exactly; 301s for every legacy and junk URL; sitemap resubmitted |
| Contact endpoint abused as an open relay | High | Fixed recipient, Turnstile, honeypot, rate limiting, CRLF rejection |
| Duda cancelled before verification | High | Explicit hold: minimum one-week window post-cutover |
| DMARC blackholes legitimate mail | Medium | `p=none` monitor mode first; tighten only after reports are clean |
| Pixel-match regressions | Medium | Playwright visual diffs against live |

## Out of scope

- Content rewriting and SEO content strategy (separate scheduled workstream)
- Redesign of any kind — this migration is deliberately invisible to visitors
- Blog posts themselves (the blog ships empty and ready)
- Upsell/service-expansion planning (separate workstream)

## Open items requiring client input

These block deployment, not development:

1. The delivery address for `CONTACT_RECIPIENT`.
2. Real URLs for the Facebook, Twitter/X, Yelp, and WhatsApp links, or
   confirmation to remove them.
3. Confirmation of correct business hours (live says Mon–Fri 9–6, Sat 10–5;
   `map.js` disagrees).
4. Creation of a deliverable `dmarc@ircoffice.com` mailbox.
