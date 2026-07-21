// Testimonials carousel, ported from the legacy inline `new Swiper('.swiper-container', ...)`
// script. Swiper 11 (unlike the unversioned unpkg bundle the legacy site loaded) ships as a
// modular core with no built-in modules, so Navigation/Autoplay must be imported and registered
// explicitly via `modules: [...]`. It also renamed its root element class from
// `.swiper-container` to `.swiper` (the constructor still accepts any element regardless of
// class, but the vendored CSS's sizing/overflow rules target `.swiper` — see the `swiper` class
// added alongside `swiper-container` on the markup in index.astro). Full API-difference list is
// in the task report.
import Swiper from 'swiper';
import { Autoplay, Navigation } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';

const container = document.querySelector<HTMLElement>('.swiper-container');

if (container) {
  new Swiper(container, {
    modules: [Navigation, Autoplay],
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    autoplay: true,
  });
}
