// Ported from the legacy `animation.js` (repo root). The nav-toggle code that used to live here
// has moved to `src/components/Nav.astro`, next to the markup it operates on — it ran at module
// scope against elements that don't exist on every page, which is why it used to throw.
//
// This module also absorbs the COVID notification banner open/close animation that shipped as a
// separate inline <script> in the legacy index.html (right after animation.js's own <script>
// tag). Task 7 ported the `.top-notification` / `.bottom-notification` markup and `#close-icon` /
// `#close-icon-2` buttons statically and explicitly deferred this GSAP wiring to this task (see
// src/pages/index.astro and .superpowers/sdd/task-7-report.md, decision #1).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Hero entrance: form box slides in from the right, header/form content fade up behind it.
const heroTimeline = gsap.timeline({ delay: 1 });

gsap.from('.form-box--greencard', {
  opacity: 0,
  xPercent: 100,
  duration: 1.3,
  ease: 'back.out(1.2)',
  delay: 0.5,
});

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

// "Who are we" section: slides in from the left once scrolled into view.
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

// "Why choose us" facility cards: fade/slide up with a stagger once scrolled into view.
const facilityTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: '.section__save-time',
    start: '-30% bottom',
  },
});

facilityTimeline.from('.facility__block', {
  opacity: 0,
  yPercent: 100,
  duration: 0.7,
  stagger: 0.2,
});

// COVID notification banners: collapsed by default, animate open shortly after load, and close
// (each closing the other) when their × icon is clicked. Guarded because this module is imported
// globally from BaseLayout, and not every page carries these banners.
const topNotification = document.querySelector<HTMLElement>('.top-notification');
const bottomNotification = document.querySelector<HTMLElement>('.bottom-notification');
const closeIcon = document.getElementById('close-icon');
const closeIcon2 = document.getElementById('close-icon-2');

if (topNotification && bottomNotification) {
  gsap.set(topNotification, { height: 0 });
  gsap.set(bottomNotification, { yPercent: 100 });

  gsap.timeline({ delay: 2 }).to(topNotification, {
    duration: 0.8,
    height: 'auto',
  });

  gsap.timeline({ delay: 1 }).to(bottomNotification, {
    duration: 0.8,
    yPercent: 0,
  });

  if (closeIcon && closeIcon2) {
    // The legacy inline script had each button call the other's `.click()`, which
    // re-enters the same two listeners synchronously and recurses until the call stack
    // overflows (verified: HTMLElement.click() dispatches and runs listeners
    // synchronously, so closeIcon -> closeIcon2.click() -> closeIcon.click() -> ...
    // never returns). Closing both banners directly, without simulating clicks,
    // reproduces the intended behavior — either × closes both banners — without the
    // recursion.
    const closeBoth = (): void => {
      gsap.to(topNotification, {
        duration: 0.4,
        height: '0',
        delay: 0.1,
      });
      gsap.to(bottomNotification, {
        duration: 0.4,
        yPercent: 100,
        delay: 0.1,
      });
    };

    closeIcon.addEventListener('click', closeBoth);
    closeIcon2.addEventListener('click', closeBoth);
  }
}
