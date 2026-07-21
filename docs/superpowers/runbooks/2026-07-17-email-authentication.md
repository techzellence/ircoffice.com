# Runbook: Email Authentication for ircoffice.com

**Executed by:** a human with GoDaddy DNS and Google Workspace admin access.
**Not automatable** — no code, no tests, console access required.
**Do this first.** It is independent of the site migration and closes a live exposure.

## Why this is urgent

`ircoffice.com` currently has **zero TXT records** — no SPF, no DKIM, no DMARC. Verified 2026-07-17 against the authoritative nameserver:

```
$ dig @ns65.domaincontrol.com TXT ircoffice.com +noall +answer
(no records)
```

With no SPF, DKIM, or DMARC, a receiving mail server has nothing to validate an inbound `From: @ircoffice.com` against, so a forged message passes by default. Anyone can send mail as ircoffice.com today.

For this business that is not a theoretical concern. IRC's clients are immigrants, often not native English speakers, in precarious legal situations, corresponding about passport numbers, A-numbers, and SSNs. A convincing email from "IRC" instructing a client to confirm details or pay a fee is trivially sendable right now. Non-attorney immigration fraud ("notario" fraud) is a well-documented pattern that this exact audience is targeted by.

It also blocks the migration: adding Resend as a new sender to a domain with no SPF/DKIM means the mail lands in spam.

## Current state (verified 2026-07-17)

| Record | Value |
|---|---|
| NS | `ns65.domaincontrol.com`, `ns66.domaincontrol.com` (GoDaddy) |
| MX | `aspmx.l.google.com` (1), `alt1`/`alt2` (5), `alt3`/`alt4` (10) — Google Workspace |
| TXT | none |
| `_dmarc` | none |
| DKIM | none |

SOA serial `2021052801` — DNS untouched since May 2021.

## Prerequisite

Create a deliverable mailbox or group at **`dmarc@ircoffice.com`** in Google Workspace before publishing the DMARC record. Reports go there. Publishing a `rua=` pointing at a non-existent mailbox means the reports bounce and you learn nothing.

Expect volume: aggregate reports arrive daily from every major mailbox provider. A group, not a person's inbox.

## Steps

### 1. SPF

Add at GoDaddy DNS:

| Field | Value |
|---|---|
| Type | TXT |
| Name | `@` |
| Value | `v=spf1 include:_spf.google.com ~all` |
| TTL | 1 hour |

`~all` (softfail) not `-all` (hardfail) at this stage. Hardfail on a domain whose full sending inventory is not yet known will bounce legitimate mail. Tighten later, after DMARC reports confirm what actually sends.

**There must be exactly one SPF record.** Two SPF records is a permanent error and breaks SPF entirely — worse than having none. Verify nothing else exists first.

Verify:

```bash
dig +short TXT ircoffice.com | grep spf1
# expect: "v=spf1 include:_spf.google.com ~all"
```

### 2. DKIM (Google Workspace)

1. Google Workspace Admin → **Apps → Google Workspace → Gmail → Authenticate email**.
2. Select `ircoffice.com`, generate a **2048-bit** key. Default selector is `google`.
3. Copy the generated TXT value.
4. At GoDaddy, add: Type `TXT`, Name `google._domainkey`, Value = the copied string.
5. Wait for propagation, then click **Start authentication** in the Google console.

Verify:

```bash
dig +short TXT google._domainkey.ircoffice.com
# expect: "v=DKIM1; k=rsa; p=MIIBIjANBg..."
```

Do not skip step 5. Publishing the record without enabling authentication in the console means Google is not signing anything and the record is decorative.

### 3. DMARC — monitor mode first

| Field | Value |
|---|---|
| Type | TXT |
| Name | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:dmarc@ircoffice.com; fo=1` |
| TTL | 1 hour |

**`p=none` is mandatory at this stage.** It means "monitor and report, enforce nothing." Going straight to `p=reject` on a domain with an unknown sending inventory will blackhole legitimate mail — a billing system, a booking tool, a newsletter, anything nobody remembered. `p=none` is safe: it changes no delivery outcome, it only produces reports.

Verify:

```bash
dig +short TXT _dmarc.ircoffice.com
```

### 4. Monitor (~2 weeks)

Read the aggregate reports arriving at `dmarc@ircoffice.com`. You are answering one question: **is every legitimate sender passing SPF or DKIM?**

Expect surprises. Almost every domain has a forgotten sender. Resolve each one — either legitimise it (add to SPF) or confirm it is not yours — before tightening.

Also watch for forged mail. Given the current wide-open state, reports may show active abuse. If so, that escalates the timeline.

### 5. Tighten, in two moves, not one

Only after reports are clean:

```
v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@ircoffice.com; fo=1
```

Hold ~1 week. Confirm nothing legitimate is being quarantined. Then:

```
v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@ircoffice.com; fo=1
```

Then, and only then, consider tightening SPF `~all` → `-all`.

### 6. Resend sending subdomain

Do this when the site build reaches deployment, not before.

Resend will require SPF + DKIM records for **`send.ircoffice.com`**. Add those on the subdomain exactly as Resend specifies.

**Do not modify the root SPF record to add Resend.** The subdomain is deliberate: it isolates Resend's sending reputation from Google Workspace mail, so a deliverability problem with form notifications cannot damage the reputation of the office's actual correspondence. It also keeps the root SPF clear of the 10-DNS-lookup limit, which is a permanent-error condition that silently breaks SPF once exceeded.

DMARC on the root covers subdomains by default, so no separate `_dmarc.send` record is needed unless you want different policy there.

## Verification

All of these should return values:

```bash
dig +short TXT ircoffice.com | grep spf1
dig +short TXT google._domainkey.ircoffice.com
dig +short TXT _dmarc.ircoffice.com
```

Then send a test message from an `@ircoffice.com` address to a Gmail account. In Gmail: **Show original**. Expect `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

## Rollback

Every step is a single DNS record. Delete the record to revert. At a 1-hour TTL, rollback is effective within the hour. Nothing here touches MX, so mail delivery is not at risk at any point in this runbook.

## What this does not cover

The nameserver move to Cloudflare — that is `2026-07-17-dns-cutover.md`, and it is the step where MX records are actually at risk. These records must be carried across intact when that happens.
