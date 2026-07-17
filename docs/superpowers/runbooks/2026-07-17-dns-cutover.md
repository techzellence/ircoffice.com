# Runbook: DNS Cutover — GoDaddy → Cloudflare

**Executed by:** a human with GoDaddy registrar and Cloudflare account access.
**Not automatable** — no code, no tests, console access required.
**Prerequisites:** `2026-07-17-email-authentication.md` complete; the site build deployed and verified on a `*.pages.dev` preview.

## The one thing that must not go wrong

**Google Workspace email must keep working.**

`ircoffice.com` receives mail via Google Workspace (`MX → aspmx.l.google.com`). Moving nameservers to Cloudflare replaces the *entire* authoritative zone. Any record not recreated at Cloudflare before the switch **ceases to exist the moment the nameservers change**.

Miss the MX records and the practice stops receiving client email immediately, with no error and no warning. For a business whose clients are mid-immigration-process, that is not a recoverable inconvenience.

This runbook is sequenced so that failure is caught before it becomes visible.

## Records to replicate (verified 2026-07-17)

Re-verify immediately before starting — this snapshot is from 2026-07-17 and may have drifted.

```bash
dig @ns65.domaincontrol.com ircoffice.com ANY +noall +answer
dig +short MX ircoffice.com
dig +short TXT ircoffice.com
dig +short TXT _dmarc.ircoffice.com
dig +short TXT google._domainkey.ircoffice.com
```

| Type | Name | Value | Priority |
|---|---|---|---|
| MX | `@` | `aspmx.l.google.com` | 1 |
| MX | `@` | `alt1.aspmx.l.google.com` | 5 |
| MX | `@` | `alt2.aspmx.l.google.com` | 5 |
| MX | `@` | `alt3.aspmx.l.google.com` | 10 |
| MX | `@` | `alt4.aspmx.l.google.com` | 10 |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | — |
| TXT | `_dmarc` | (per email-auth runbook) | — |
| TXT | `google._domainkey` | (per email-auth runbook) | — |

Plus any records added since. **Do not work from this table alone** — export the live zone and diff against it. A record you forget is a record that disappears.

## Steps

### 1. Lower TTLs — 48 hours ahead

At GoDaddy, set TTL to **600 seconds** on every record, especially MX and NS.

This is what makes rollback fast. At the default TTL, a bad cutover is visible for hours because resolvers worldwide cache the old answer. At 600s, rollback propagates in ten minutes. Do this two days early — the *old* TTL has to expire before the new short one is universally in effect.

### 2. Export the current zone

GoDaddy DNS → **Export**. Save the zone file into this repo's `docs/superpowers/runbooks/` for the record. This is the rollback reference and the diff source. Do it before touching anything.

### 3. Add the site to Cloudflare

Cloudflare → Add site → `ircoffice.com`. Cloudflare scans and imports what it finds.

**Do not trust the import.** It is best-effort and misses records. Diff its result against the export from step 2, line by line. Add anything missing by hand.

Cloudflare will show you the two nameservers to use. **Do not switch to them yet.**

### 4. Verify at Cloudflare *before* switching — the critical gate

Cloudflare is now serving a zone that nothing is using yet. Query it directly:

```bash
CF_NS=<your-assigned-cloudflare-nameserver>

# MX — the ones that matter most
dig @$CF_NS MX ircoffice.com +short
# expect all five, with matching priorities

# SPF
dig @$CF_NS TXT ircoffice.com +short

# DMARC
dig @$CF_NS TXT _dmarc.ircoffice.com +short

# DKIM
dig @$CF_NS TXT google._domainkey.ircoffice.com +short
```

Compare each against the GoDaddy answer:

```bash
diff <(dig @ns65.domaincontrol.com MX ircoffice.com +short | sort) \
     <(dig @$CF_NS MX ircoffice.com +short | sort) && echo "MX MATCH"
```

**`MX MATCH` must print before you proceed.** If it does not, stop and fix the zone. There is no time pressure here — nothing has changed yet, and the live site is unaffected.

### 5. Switch nameservers

GoDaddy → Nameservers → Custom → the two Cloudflare nameservers.

Propagation is typically minutes, up to 24h worst case.

Watch it:

```bash
watch -n 30 'dig +short NS ircoffice.com'
```

### 6. Verify mail — both directions

As soon as NS shows Cloudflare:

```bash
dig +short MX ircoffice.com
```

Then, and this is the step people skip:

1. Send a test email **from an external account to** an `@ircoffice.com` address. Confirm it arrives.
2. Send a test email **from** the `@ircoffice.com` account **to** an external address. Confirm it arrives and passes SPF/DKIM/DMARC (Gmail → Show original).

Do not proceed until both pass. If inbound fails, **roll back immediately** (step 9) — do not debug with the practice's email down.

### 7. Point the site at Cloudflare Pages

Only after mail is confirmed working.

Cloudflare Pages → your project → **Custom domains** → add `ircoffice.com` and `www.ircoffice.com`.

This replaces the Duda A records (`100.24.208.97`, `35.172.94.1`) and the `www` CNAME (`s.multiscreensite.com`).

Then verify every route resolves against the real domain:

```bash
for p in / /green-card /visa /citizenship /contact /about /umra /privacy /blog; do
  printf '%-16s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://www.ircoffice.com$p)"
done
```

Expect `200` for all nine.

And the redirects:

```bash
for p in /greencard.html /visa.html /citizenship.html /contact.html \
         /green-card66789dc8 /citizhenship; do
  printf '%-24s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' https://www.ircoffice.com$p)"
done
```

Expect `301` with the correct target for each.

### 8. Post-cutover

- Google Search Console: submit `https://www.ircoffice.com/sitemap-index.xml`.
- Watch Search Console **Coverage** for a fortnight. A ranking dip in the first days is normal; a sustained one means a redirect is wrong.
- Keep reading DMARC reports. Tighten `p=none` → `quarantine` → `reject` per the email-auth runbook.
- Delete the old Google Maps API key in the Google Cloud console. It is in this repo's git history and removing it from the working tree does not revoke it.

### 9. Rollback

At GoDaddy, set the nameservers back to `ns65.domaincontrol.com` / `ns66.domaincontrol.com`. The GoDaddy zone is still intact — switching nameservers away does not delete it. With TTLs at 600s from step 1, this takes effect within ~10 minutes.

Rolling back the nameservers restores both the Duda site and Google Workspace mail together.

## Do not cancel Duda

**Hold Duda for a minimum of one week after cutover.** Longer if traffic is seasonal.

Reasons, each of which has bitten someone:

- Rollback needs somewhere to roll back *to*. Cancelling removes the fallback.
- The visual-regression baselines in `tests/visual/baseline/` were captured from the live Duda site. Once it is gone, the reference for "did we match it" is gone permanently.
- Content gaps typically surface days later, when someone notices a page that was never ported.
- The cost of one extra month of Duda is trivial against the cost of an unrecoverable mistake.

Cancel only after: all nine routes verified, all redirects verified, mail verified both directions for a week, and Search Console showing no coverage collapse.
