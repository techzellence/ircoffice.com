// Generates the 1200x630 Open Graph card committed at public/og-card.png.
// Committed as a script rather than a hand-made image so the card can be
// regenerated when the brand changes. Run: node scripts/build-og-card.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'og-card.png');

// Brand navy, matching .form-box / footer background in public/css/style.css.
const NAVY = '#174171';
const ORANGE = '#f39b4b';

const logo = readFileSync(path.join(ROOT, 'public', 'img', 'company-logo.jpeg'));
const logoDataUri = `data:image/jpeg;base64,${logo.toString('base64')}`;

// company-logo.jpeg is a 720x153 wordmark rendered on a navy background that
// is a pixel-for-pixel match for NAVY (#174171), so placing it directly on
// the card lets it blend in as if printed on the card rather than pasting a
// visible rectangle. Sized so its own "IMMIGRANT RESOURCE CENTER" wordmark
// reads as a logo mark above the larger, plain-text business name below,
// which is what needs to stay legible at WhatsApp thumbnail size (~300px).
const LOGO_WIDTH = 460;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 153) / 720);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${NAVY}"/>
  <rect x="0" y="606" width="1200" height="24" fill="${ORANGE}"/>
  <image href="${logoDataUri}" x="90" y="72" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}"
    preserveAspectRatio="xMinYMin meet"/>
  <text x="90" y="330" font-family="Helvetica, Arial, sans-serif" font-size="74" font-weight="700"
    fill="#ffffff">Immigrant Resource Center</text>
  <text x="90" y="404" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="400"
    fill="${ORANGE}">Immigration &amp; Travel Services</text>
  <text x="90" y="466" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="400"
    fill="#cbd6e4">Minneapolis, Minnesota &#183; Since 1999</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log(`wrote ${OUT}`);
