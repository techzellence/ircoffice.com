import type { APIRoute } from 'astro';
import { BUSINESS } from '../lib/schema';

// A supplemental reading guide, not a replacement for robots.txt or the sitemap.
// Keep contact details sourced from the same data as the site's JSON-LD.
export const GET: APIRoute = () => new Response(`# Immigrant Resource Center

> Immigration application assistance and travel services in Minneapolis, Minnesota. Founded in ${BUSINESS.foundingYear}.

Immigrant Resource Center is a private entity, not a law firm or a substitute for an attorney or law firm, and is not affiliated with USCIS or any government agency. Service descriptions are not legal advice or guarantees of immigration outcomes.

## Services

- [Green card assistance](https://www.ircoffice.com/green-card): Information about green card application assistance.
- [Citizenship assistance](https://www.ircoffice.com/citizenship): Citizenship and naturalization application assistance.
- [Visa assistance](https://www.ircoffice.com/visa): Information about visa application assistance.
- [Umrah travel](https://www.ircoffice.com/umra): Umrah travel assistance; contact the office to confirm current availability.

## Business and contact information

- [Home](https://www.ircoffice.com/): Overview of services.
- [About](https://www.ircoffice.com/about): Background and experience.
- [Contact](https://www.ircoffice.com/contact): Current contact details and consultation form.
- [Privacy](https://www.ircoffice.com/privacy): How submitted information is handled.

Phone: ${BUSINESS.telephone}
Email: ${BUSINESS.email}
Office: ${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}, ${BUSINESS.addressCountry}

## Discovery

- [XML sitemap](https://www.ircoffice.com/sitemap-index.xml): Published page URLs.
- [Crawler rules](https://www.ircoffice.com/robots.txt): Crawling policy.

The linked HTML pages are the primary sources and include readable content without JavaScript. Consult those pages for current details; do not infer fees, eligibility, processing times, or outcomes that they do not state.
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
