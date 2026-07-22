# ircoffice.com — answers to designer questions

**Date:** 2026-07-22
**Companion to:** `DESIGN-BRIEF.md`

Answers in your order. Where something is still unknown, it says so rather than guessing —
please don't fill those gaps with invented specifics.

---

## 1. What should the redesign deliver first?

**Homepage + one service page + the contact path.**

Pick whichever service page best exercises the hard problems — our instinct is Green Card
(highest intent, densest content), but if Citizenship makes the argument better, take it.

Reasoning: the brief's central bet is that trust framing is the real problem. Prove that on
the highest-traffic path before committing to all nine pages. If the direction is wrong we'd
rather find out on three pages than nine.

Design the system, not three one-offs — we should be able to see how the remaining pages
follow.

---

## 2. Primary design viewport

**Mobile-first, 390px.** Then desktop at 1280px. Tablet (768px) exists in our test suite but
is the least important.

Not a stylistic preference — this audience is disproportionately mobile-only. If a layout
only resolves at desktop width, it's the wrong layout.

---

## 3. Recreate the current site faithfully first?

**No.** Don't spend any budget there.

The current site is live, we have full screenshots at all three viewports, and we can give you
a staging URL any time. The baseline already exists. Go straight to proposals.

---

## 4. Variations — and of what?

Yes, but only where we're genuinely uncertain. Two areas:

- **The homepage trust framing.** This is the brief's core unsolved problem and the place
  where different approaches could diverge most. Two or three distinct takes would be
  genuinely useful.
- **The "find your situation" pattern** (see Q6). Same reasoning.

Everywhere else, one well-argued direction beats three hedged ones. Please don't produce
variations of things like the contact page.

---

## 5. Pricing — what can the design assume?

**The client does not publish prices. That's policy, and it isn't changing.**

This makes the problem harder rather than removing it. The underlying need doesn't go away:
someone deciding between this and a $3,000 attorney, who may have been overcharged before, is
carrying real cost anxiety. Silence currently reads as risk.

So the question becomes: **how do you reduce cost anxiety without publishing numbers?**

Some directions used elsewhere in professional services — none prescribed, all fair game:
what factors affect cost, an explicit commitment that you'll know the full cost before
committing to anything, transparency about the *process* of pricing rather than the prices,
or being clear that an initial conversation costs nothing (if true — confirm before using).

**Do not invent figures, ranges, or "starting from" numbers**, even as placeholders in a
comp. A fee that appears in a mockup has a way of shipping.

---

## 6. How should someone who doesn't know form numbers find their situation?

This is yours to solve — it's one of the questions we most want your answer to. But there's a
serious constraint you can't be expected to know:

> **Anything that tells a user which immigration benefit they qualify for edges into
> unauthorized practice of law.**

IRC employs no attorneys. A flow that takes someone's circumstances and outputs "you qualify
for a K-1 visa" or "you should file Form I-130" is arguably legal advice from a non-attorney —
precisely the *notario* problem the brief describes, and a genuine legal exposure for the
business.

The safe framing is **descriptive and navigational**, not advisory:

- ✅ "People bringing a spouse from abroad usually start here" → routes to information
- ❌ "Based on your answers, you qualify for…" → renders a determination

The difference is whether the site is *organising information by situation* or *assessing an
individual's case*. The first is enormously useful and completely safe. The second is the
thing that must never ship.

Within that boundary, anything goes — plain-language entry points, situation-based routing,
progressive disclosure, a different IA entirely. Every output should end in "talk to us",
never in an answer.

---

## 7. Can you write new copy?

**Yes — please do.** Draft freely: FAQ answers, first-visit description, plain-language
service names, section headings, microcopy.

Two constraints:

1. **Everything gets a UPL review before publish.** Not a bottleneck on drafting — write what
   the design needs, we'll review as a batch. Watch for: implying legal advice or
   representation, predicting outcomes, guarantee language ("we'll get you approved"), or
   removing hedges. Existing hedges — "may qualify", "typically", "in most cases" — are load-
   bearing and must survive.
2. **Don't invent facts.** See Q12 for what we actually know. Processing times, fees, success
   rates, staff credentials, and languages spoken are all things we do NOT have confirmed. If
   the design needs one, mark it clearly as a placeholder and we'll get it confirmed.

Plain, calm, short sentences. Many readers are working in a second language or using browser
translation.

---

## 8. Imagery of the actual office and staff?

**Assume not available.** Design without it.

This is a real constraint on the brief's "feel like this specific office" goal, and worth
naming plainly: without real photography, distinctiveness has to come from somewhere else —
typography, colour, illustration, structure, the way information is organised, and the
testimonials (which are real and specific — see Q12).

If your direction genuinely depends on real photography, say so and make the case. It's not
categorically impossible, just not something to plan around. What's ruled out is more generic
stock: the current site's Statue of Liberty and waving flags are a large part of why it reads
as a template.

---

## 9. Contact paths to design for

Confirmed and real:

- **Phone** — (612) 822-5747. Likely the highest-trust channel for this audience.
- **The web form** — currently the only path, repeated seven times.
- **Email** — info@ircoffice.com
- **Walk-in** — 1 W Lake St Ste #165, Minneapolis. A physical, findable office is itself a
  trust signal, especially against fraud concerns. There's a map on the contact page.
- **Saturday hours** — Mon–Fri 9am–6pm, **Sat 10am–5pm**. Genuinely differentiating; one
  testimonial is from someone who drove an hour on a Saturday. Currently buried in the footer.

**Not confirmed: WhatsApp.** The old site had a WhatsApp link with no phone number in it.
Given this audience communicates heavily by WhatsApp it's an obvious opportunity, but we can't
confirm the business runs one. Design it as optional/conditional; we're asking.

---

## 10. How prominent should Umrah travel be?

**Secondary. Keep it reachable, don't feature it.**

It's a real but minor line. The risk is dilution: a travel offering next to immigration
services can make the whole operation read as less specialised, which cuts directly against
the trust problem.

Context worth having — the live Umrah page was Lorem ipsum placeholder text, so it was never
invested in. The current copy is a draft we wrote and the client has not yet reviewed.

---

## 11. Design the blog post template too?

**Yes, but keep it light.** An article template and an index state — that's enough.

It ships with zero posts. The infrastructure is built and ready (Astro content collections),
and there's currently no styling at all. What matters is that it's readable and looks
deliberate rather than unfinished. Don't over-invest ahead of content that doesn't exist yet.

---

## 12. Known facts — use these, invent nothing else

**Confirmed:**

| Fact | Value |
|---|---|
| Founded | 1999 (immigrant-owned, family-run) |
| Address | 1 W Lake St Ste #165, Minneapolis, MN 55408 |
| Phone | (612) 822-5747 |
| Email | info@ircoffice.com |
| Hours | Mon–Fri 9am–6pm; **Sat 10am–5pm** |
| Not a law firm | No attorneys. Form preparation and process guidance only |
| Services | Green card, citizenship/naturalization, visas (family, fiancé(e), visitor), ~26 listed form services, plus Umrah travel |

**Evidenced but anecdotal — usable if attributed, not as an official claim:**

- **A visit takes about an hour.** Two separate testimonials say so ("I completed everything I
  needed within an hour"). Real signal, but it's customer testimony, not a service guarantee.
- **A named staff member, "Ayan"**, appears in a testimonial and is clearly a real person.

**The testimonials are real** and better than they look. Specific, human, credible — "I drove
today (Saturday) from Prior Lake, about an hour drive, not expecting the process would be very
easy." They're currently undermined by their presentation: each reviewer's *name* is marked up
as a dead link styled as an orange button, and the star ratings are five literal asterisk
characters. Fixing that is probably the cheapest credibility gain on the site.

**NOT confirmed — do not state these anywhere:**

- **Fees or price ranges** (policy — see Q5)
- **Processing times** for any application
- **Success or approval rates** — never, under any framing
- **Which languages the office speaks.** The site claims "multilingual" but never says which.
  For a Lake Street practice serving Somali, Latino, Hmong and East African communities, naming
  the actual languages could be one of the strongest trust signals available. We're asking the
  client. If your design has a natural place for it, leave the slot.
- **Staff names, roles, credentials, or headcount** beyond "Ayan" above.

---

## Still with the client

Two open items we're chasing. Neither should block you — design around them:

1. **Which languages are spoken in the office?**
2. **Does the business use WhatsApp for client contact?**

We'll pass these on as soon as we have them.
