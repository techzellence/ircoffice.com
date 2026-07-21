// Ported from the legacy `animation.js` (repo root). The nav-toggle code that used to live here
// has moved to `src/components/Nav.astro`, next to the markup it operates on — it ran at module
// scope against elements that don't exist on every page, which is why it used to throw.
//
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// This module is imported globally from BaseLayout, so it runs on every page, but each animation
// below targets an element that exists on only some of them (the greencard form box is on the
// service pages; the hero pair is on the home page). Tweening a selector that matches nothing
// makes GSAP log "target not found" on every page that lacks it — which is why each block is
// guarded. Same reasoning as the nav-toggle note above: don't run page-specific code everywhere.
const has = (selector: string): boolean => document.querySelector(selector) !== null;

// Service-page hero: form box slides in from the right.
if (has('.form-box--greencard')) {
  gsap.from('.form-box--greencard', {
    opacity: 0,
    xPercent: 100,
    duration: 1.3,
    ease: 'back.out(1.2)',
    delay: 0.5,
  });
}

// Home hero: header content slides in from the left, then the form scales up behind it.
if (has('.header__home--animation') && has('.form__home--animation')) {
  const heroTimeline = gsap.timeline({ delay: 1 });

  heroTimeline.from('.header__home--animation', {
    opacity: 0,
    xPercent: -100,
    duration: 1.3,
  });

  heroTimeline.from(
    '.form__home--animation',
    {
      opacity: 0,
      scale: 0.2,
      duration: 1,
    },
    '-=1',
  );
}

// "Who are we" section: slides in from the left once scrolled into view.
if (has('.section-about-company')) {
  const aboutTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.section-about-company',
      start: '18% bottom',
    },
  });

  aboutTimeline.from('.section-about-company', {
    opacity: 0,
    xPercent: -100,
    duration: 1,
  });
}

// Note: the legacy recreation also wired a "why choose us" facility-card scroll animation here
// (ScrollTrigger on `.section__save-time`, tweening `.facility__block`). Task 13's live-site
// screenshot triage checked the actual home page (`.facility__card` x3, no `.section__save-time`
// element at all) and confirmed the live site does not animate that section either -- both
// selectors were dead on arrival, pre-dating this task, and removing the block only silences a
// console warning; it changes no rendered pixel on either side.

// The COVID-19 notification banners and their open/close animation were removed: the copy dated
// from 2020 but was presented as current news, which on a live site reads as abandoned. The
// markup went with it (src/pages/index.astro) along with the now-dead .top-notification /
// .bottom-notification / .paragraph-notification / .notification-close* CSS.
