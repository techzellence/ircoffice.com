# Dashboard checklist: get leads flowing (2026-10-24)

I can't make these changes myself: my Cloudflare login on this Mac doesn't include the **Main**
account that owns `ircoffice-com`, and the Cloudflare API connector isn't authorized. (If you
authorize the Cloudflare API connector, I can do sections A, B, C and E for you.)

Do them in order. Tell me when each section is done and I'll verify it from outside with
`dig`/`curl`. Nothing here touches the MX records or Google Workspace mail delivery.

**What I found live today**

| Check | Result |
|---|---|
| `https://www.ircoffice.com/` | 301 → `https://ircoffice.com/` (someone added a www → apex redirect) |
| `<link rel="canonical">` on every page | `https://www.ircoffice.com/…`, which redirects back to the apex: a conflicting signal for Google |
| Turnstile widget | no `data-sitekey`, so every form submission gets 403 |
| SPF / DKIM / DMARC on ircoffice.com | none (zero TXT records) |
| `send.ircoffice.com` (Resend) | no records, so it's not verified |
| Analytics beacon | token is literally `undefined` |
| Rate limiting (KV) | **working**: the 5th request in an hour got 429 |

---

## A. Make www the main address (Cloudflare, Main account)

The site was built with `www.ircoffice.com` as the main address (that's where the old rankings
live), so www should serve the site and the bare domain should redirect to it. Today it's the
other way round.

1. **Workers & Pages → `ircoffice-com` → Custom domains → Set up a custom domain** →
   `www.ircoffice.com`. When Cloudflare offers to update the existing `www` DNS record, accept
   it. Wait until the domain shows **Active**.
2. **Rules → Overview**: find the rule that currently redirects `www.ircoffice.com` to
   `ircoffice.com` (check Redirect Rules, Page Rules and Bulk Redirects) and **delete it**.
3. **Rules → Create rule → Redirect Rule**:
   - Name: `apex to www`
   - When incoming requests match: **Hostname** equals `ircoffice.com`
   - Then: **Dynamic**, expression
     `concat("https://www.ircoffice.com", http.request.uri.path)`
   - Status code: **301**
   - **Preserve query string**: on
   - Deploy.

   Keep `ircoffice.com` as a custom domain on the Pages project; the rule runs before Pages.
   Never have the step-2 rule and this one active at the same time (that's a redirect loop).

## B. Turnstile widget (Cloudflare, Main account)

**Turnstile → Add widget**

- Widget name: `ircoffice.com contact forms`
- Hostnames: `www.ircoffice.com`, `ircoffice.com`, `ircoffice-com.pages.dev`
- Widget mode: **Managed**
- Create, then copy the **site key** and the **secret key**.

## C. Pages variables and secrets

**Workers & Pages → `ircoffice-com` → Settings → Variables and Secrets.** Add each one to
**Production** and to **Preview**:

| Name | Type | Value |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | Text | site key from B |
| `TURNSTILE_SECRET_KEY` | **Secret** | secret key from B |
| `PUBLIC_CF_BEACON_TOKEN` | Text | token from E (you can add this one later) |

Also confirm these two secrets already exist (don't paste their values to me):
`RESEND_API_KEY`, `CONTACT_RECIPIENT`.

Then **Deployments → the latest Production deployment → ⋯ → Retry deployment.** The site key is
compiled into the HTML at build time, so the forms stay broken until a rebuild.

## D. Resend: verify the sending domain

1. Sign in at resend.com (tell me if the account doesn't exist yet).
2. **Domains → Add domain** → `send.ircoffice.com`.
3. Resend shows about three records (a DKIM TXT, an MX and an SPF TXT). They all sit
   **under `send.ircoffice.com`**, so they don't touch the root MX records. Add each one in
   **Cloudflare → ircoffice.com → DNS → Records** exactly as shown, with proxy status
   **DNS only** (grey cloud). In Cloudflare's Name field, type the name without the trailing
   `.ircoffice.com`, for example `resend._domainkey.send`.
   (Resend may offer to **auto-configure with Cloudflare**. That's fine too.)
4. Click **Verify** in Resend and wait for **Verified**.
5. If you're not sure the existing `RESEND_API_KEY` secret is valid, create a new API key
   (Sending access, restricted to `send.ircoffice.com`) and replace the secret.

## E. Web Analytics token

**Analytics & Logs → Web Analytics → Add a site** → `www.ircoffice.com`. Choose the **manual
JS snippet** (not automatic injection, which would double-count), copy the value of `"token"`
from the snippet, and put it in `PUBLIC_CF_BEACON_TOKEN` (section C). Then retry the deployment
again.

## F. Email authentication for ircoffice.com (stops spoofing)

**First, one question for the client:** does anything other than Gmail send email *as*
`@ircoffice.com`, such as a booking tool, invoicing software, a newsletter service or an office
scanner? If so, tell me before you publish the SPF record so it can be included.

All in **Cloudflare → ircoffice.com → DNS → Records**, all **DNS only**:

1. **SPF**: type TXT, name `@`, content `v=spf1 include:_spf.google.com ~all`
2. **DKIM** (needs a Google Workspace admin): admin.google.com → Apps → Google Workspace →
   Gmail → **Authenticate email** → domain `ircoffice.com` → **Generate new record** (2048-bit,
   prefix `google`). Add it as type TXT, name `google._domainkey`, with the value Google shows.
   Wait about 30 minutes, then go back to Google Admin and click **Start authentication**.
3. **DMARC**, starting in monitor-only mode. Pick one:
   - **Recommended:** Cloudflare → ircoffice.com → **Email → DMARC Management → Enable**.
     Cloudflare publishes the record with its own report address and charts the reports for you;
     no mailbox needed. Make sure the policy it sets is `p=none`.
   - Or create a `dmarc@ircoffice.com` alias or Google Group, send it a test email to prove it
     receives mail, then add TXT name `_dmarc`, content
     `v=DMARC1; p=none; rua=mailto:dmarc@ircoffice.com`

   Stay at `p=none` for about two weeks while the reports confirm every legitimate sender
   passes. Only then tighten to `quarantine`, and later `reject`.

**Don't edit or delete the five Google MX records.**

---

## G. Then: live form tests (needs a time agreed with the client)

Test emails land in the client's real inbox. Before I send any, tell me:

1. Which address `CONTACT_RECIPIENT` delivers to, so we can check that inbox.
2. A time window when the client knows to expect two or three messages marked **TEST**.

The plan: confirm the widget renders on all 7 forms, submit at least 2 labelled tests, then
check delivery, the spam folder, Reply-To, the invalid-email error, the honeypot, the 429 on
the 6th rapid submission, and the Pages Function logs.
