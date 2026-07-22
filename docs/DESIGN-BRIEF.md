# ircoffice.com — design brief

**For:** UI/UX designer
**From:** engineering
**Date:** 2026-07-22
**Status:** directional. Deliberately not a spec.

---

## How to use this

This brief describes **what's wrong and who it's wrong for**. It does not tell you what to
build. Where we've written "how might someone…", that's an open question we want your answer
to — not a solution we've withheld.

Two sections are firm: **Constraints** (legal and accessibility requirements that cannot be
designed around) and **Already handled** (work that's done — please don't spend budget
redoing it). Everything else is yours.

If you think the whole information architecture is wrong, say so. We'd rather hear that now.

---

## The business

Immigrant Resource Center — a family-owned, immigrant-owned immigration and travel services
practice on West Lake Street in Minneapolis. Established 1999.

They prepare immigration paperwork: green card applications, citizenship and naturalization,
family and visitor visas, plus Umrah travel packages. They are **not a law firm** and employ
no attorneys. They fill in forms correctly, organise supporting documents, and explain the
process. That distinction is legally load-bearing (see Constraints).

The site was on Duda, built around 2020 from a template. We've just rebuilt it as a static
Astro site — same content, same layout, modern foundations. It is faithful to what existed.
It is not good.

---

## Who you're actually designing for

This is the part most likely to change your instincts, so it comes before the problems.

**They are frightened.** Not "considering options" — frightened. The outcome of the paperwork
on this site can decide whether someone's spouse can enter the country, whether a parent gets
to stay, whether a child's status resolves before they turn 21. Anxiety is the dominant
emotional state of nearly every visitor. Design that reads as slick, clever, or salesy will
work against you.

**Many are reading in a second language.** Minneapolis has large Somali, Latino, Hmong, and
East African communities, and West Lake Street sits in the middle of that. Expect visitors
who read slowly, use browser translation, or have a family member reading on their behalf.
Sentence length and visual clarity matter more than voice.

**They're on phones.** Disproportionately mobile-only. Treat desktop as the secondary case.

**They share links in WhatsApp**, not email. A link gets forwarded to a cousin, an aunt, a
community group. The shared preview is often the first impression, not the homepage.

**They have been targeted by fraud.** This matters enormously and is the strategic core of
the brief.

---

## The strategic problem: earning trust in an industry that has abused it

"Notario fraud" is a documented, widespread problem in US immigration services: non-attorney
consultants who imply legal authority, take large fees, and file damaging or fraudulent
paperwork. In many Latin American countries a *notario público* is a trained lawyer, so the
title itself misleads. Victims lose money and sometimes their immigration status.

IRC is a legitimate version of this service category. But their prospective clients cannot
tell the difference from a website, and the ones who've been burned before are the most
suspicious.

So the site has to do something genuinely difficult:

> **Be unmistakably clear that this is not legal representation — while making that
> honesty feel like competence and safety, not a limitation.**

Right now the site does the first half. There's a disclaimer in the footer of every page
stating they're not a law firm. Legally sound, emotionally inert — it reads as fine print,
which is exactly what a fraudulent operator's disclaimer also looks like.

The opportunity: make transparency the most reassuring thing on the page. What does a
trustworthy non-attorney service look like when it's proud of what it is?

We don't know the answer. That's the brief.

---

## Constraints — these are firm

**Legal (non-negotiable).** Nothing may state or imply that IRC provides legal advice, legal
representation, attorney services, or predicts case outcomes. No "we'll win your case", no
"guaranteed approval", no attorney iconography (scales, gavels, columns). Hedging language
("may qualify", "typically") must survive — it's both accurate and protective. The
not-a-law-firm disclaimer stays on every page; you may absolutely redesign how it's
presented, but not remove or soften it.

**Accessibility.** WCAG 2.1 AA minimum. Text contrast 4.5:1 (3:1 for large). Real form
labels, not placeholder-only. Full keyboard operability. This audience skews older and
includes people using translation tools and screen magnification — AA is a floor, not a
target.

**Performance.** Mobile users on constrained data plans. We just cut image weight 69%; please
don't spend it on decorative hero video or a heavy font stack. Budget-conscious design is a
feature here, not a compromise.

**Language.** The site is English-only today. Multilingual support is not in scope, but
**don't design anything that would be painful to translate** — avoid text baked into images,
tight-fitting labels, or layouts that break when a string doubles in length. German and
Somali translations run long.

---

## Where the experience is weakest

Framed as problems and questions. Solutions are yours.

**1. Nothing tells anyone what this costs.**
Not one figure, range, or explanation of how pricing works. For an audience that has been
overcharged before — and that is deciding between this and a $3,000 attorney — silence reads
as risk. Cost may be the single most-wanted piece of missing information on the site. How
might someone get a sense of affordability without the business committing to numbers it
can't honour?

**2. The homepage lists 26 services as a spreadsheet.**
A table of service names and form numbers — N-400, I-485, I-751, DS-3032. Comprehensive, and
completely undifferentiated. Someone who doesn't know which form they need (i.e. everyone who
needs help) cannot use it. How might a frightened person who doesn't know the vocabulary find
their situation?

**3. There's no answer to "what actually happens if I come in?"**
No description of a first visit, what to bring, how long it takes, what it feels like. The
testimonials hint at it — one mentions finishing in an hour, another mentions Saturday
opening — but the site never says it directly. Uncertainty is friction for an anxious person.

**4. Real testimonials are presented as though they were fake.**
The reviews are genuinely good — specific, human, credible ("I drove today from Prior Lake,
about an hour"; "I had Ayan help me and she was super helpful"). The presentation actively
undermines them: each reviewer's *name* is marked up as a dead link styled as an orange
button, and the star ratings are five literal asterisk characters. Real social proof is being
made to look like advertising. This is the cheapest credibility win available.

**5. The only way to make contact is the same form, seven times.**
One form component, repeated on every page. No alternative paths, no sense of what happens
after submitting, no indication of response time. Some people will never fill in a web form
about their immigration status — what else could they do? (Note: phone and WhatsApp are how
much of this audience actually communicates.)

**6. The service pages are undifferentiated walls of text.**
Roughly 900–1,800 words each, much of it adapted from USCIS source material, in long
paragraphs and bulleted lists. Accurate and unreadable. Someone scanning on a phone at 11pm
cannot find the one fact they came for. How might this content be structured so it's useful
at a glance and still complete for those who need depth?

**7. Recurring questions get answered nowhere.**
No FAQ anywhere on the site. In immigration, the same handful of questions come up
constantly. There's an obvious content gap here and a matching search-visibility opportunity.

**8. The visual language is generic-2020-template.**
Statue of Liberty, waving flags, stock photography that could belong to any immigration site
in any city. Nothing communicates *this* office — a specific family business on Lake Street
since 1999, in the community it serves. There is real distinctiveness available and none of
it is being used.

**9. A blog exists, is empty, and is unstyled.**
Infrastructure is built and ready. Nobody has designed what a post should look like, and
nothing has been written.

---

## Already handled — please don't redo

Recent engineering work you can build on rather than repeat:

- **Colour contrast fixed to AA.** The brand orange was failing at 2.6–2.8:1 and has been
  darkened to a two-token system: a dark orange for text on light backgrounds, a lighter one
  for text on navy. Both hit 4.5:1 with the original hue preserved. If you re-pick brand
  colours, please re-verify contrast — this was a deliberate, tested change.
- **Dark mode no longer breaks the site.** It's a light-only design that now declares itself
  as such, instead of inheriting a dark canvas and rendering dark-on-dark.
- **Form accessibility.** Labels were `visibility:hidden`, which removed them from the
  accessibility tree entirely — the primary lead-capture form was unlabelled for both sighted
  users and screen readers. Fixed, with placeholders added.
- **Images.** 69% weight reduction, AVIF/WebP with fallbacks. 9 MB of unused template stock
  removed.
- **Social sharing.** Links previously shared as bare URLs with no preview. There's now a
  branded card. If you want to design a better one, please do — but the plumbing works.
- **Structured data, sitemap, redirects, security headers.** Done.
- **Copy corrections.** A grammar pass fixed real errors, including in the legal disclaimer,
  and removed language that implied IRC adjudicates applications.

---

## What we are deliberately not prescribing

No page count. No navigation structure. No component inventory. No layout direction. No
opinion on whether the current brand survives.

If the right answer is "this should be three pages, not nine", make that case. If the
services table should become something else entirely, show us. If the homepage shouldn't lead
with a hero image, we're listening.

The only things we'd defend are in Constraints. Everything else is negotiable with a good
argument.

---

## How we'll judge it

In rough priority:

1. **Would a frightened person trust this?** The hardest and most important test.
2. **Can someone who doesn't know the vocabulary find their situation?**
3. **Does it work on a mid-range Android phone on a slow connection?**
4. **Is the non-attorney distinction clear — and does it read as integrity rather than a
   caveat?**
5. **Does it feel like this specific office**, not a category template?
6. **AA accessibility, verified rather than assumed.**

Deliberately absent: "does it look modern". It can look modern. That's not the goal.

---

## Technical reality

Static Astro site on Cloudflare Pages. Plain HTML/CSS output — no React, no component library.
GSAP and Swiper are available and already in use. Contact forms POST to a serverless function
that emails the office.

Practically: near-total freedom on layout, type, colour, and motion. Anything requiring
server-rendered personalisation, user accounts, or a CMS is a larger conversation — flag it
early and we'll scope it rather than rule it out.

Design at whatever fidelity suits you. If it helps, we can provide the live site, the current
component list, or a staging URL.

---

## Open questions we'd like your view on

1. What's the single highest-impact change, if only one thing could be done?
2. Does the current information architecture survive, or does the whole thing need restructuring?
3. Is there a way to convey pricing that's honest, useful, and safe for the business?
4. What would make the not-a-law-firm distinction feel like a strength?
