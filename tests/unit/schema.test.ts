import { beforeAll, describe, expect, it } from 'vitest';

import { BUSINESS, breadcrumbSchema, professionalServiceSchema } from '../../src/lib/schema';
import { ROUTES, assertDistIsFresh, readDistPage } from './lib/dist';

const ORIGIN = 'https://www.ircoffice.com';

describe('professionalServiceSchema', () => {
  const schema = professionalServiceSchema(ORIGIN);

  it('is a ProfessionalService, never a LegalService', () => {
    // IRC is not a law firm. schema.org LegalService would assert to Google that
    // it is one — the exact claim the disclaimer exists to deny.
    expect(schema['@type']).toBe('ProfessionalService');
    expect(JSON.stringify(schema)).not.toContain('LegalService');
  });

  it('carries NAP that matches the rendered pages exactly', () => {
    expect(schema.name).toBe('Immigrant Resource Center');
    expect(schema.telephone).toBe('(612) 822-5747');
    const address = schema.address as Record<string, string>;
    expect(address.streetAddress).toBe('1 W Lake St Ste #165');
    expect(address.addressLocality).toBe('Minneapolis');
    expect(address.addressRegion).toBe('MN');
    expect(address.postalCode).toBe('55408');
  });

  it('uses absolute URLs', () => {
    expect(schema.url).toBe(`${ORIGIN}/`);
    expect(String(schema.image)).toMatch(/^https:\/\//);
  });

  it('publishes both opening-hours blocks', () => {
    const hours = schema.openingHoursSpecification as Array<Record<string, unknown>>;
    expect(hours).toHaveLength(2);
    const [weekdayHours, saturdayHours] = hours;
    if (!weekdayHours || !saturdayHours) throw new Error('expected two opening-hours blocks');
    expect(weekdayHours.opens).toBe('09:00');
    expect(weekdayHours.closes).toBe('18:00');
    expect(saturdayHours.dayOfWeek).toEqual(['Saturday']);
    expect(saturdayHours.closes).toBe('17:00');
  });

  it('omits sameAs while no real social profiles exist', () => {
    expect(schema.sameAs).toBeUndefined();
  });

  it('geo-locates the office', () => {
    const geo = schema.geo as Record<string, number>;
    expect(geo.latitude).toBeCloseTo(44.9483, 3);
    expect(geo.longitude).toBeCloseTo(-93.2787, 3);
  });
});

describe('breadcrumbSchema', () => {
  it('numbers positions from 1 and resolves absolute item URLs', () => {
    const schema = breadcrumbSchema(ORIGIN, [
      { name: 'Home', path: '/' },
      { name: 'Green Card', path: '/green-card' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    const items = schema.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    const [home, greenCard] = items;
    if (!home || !greenCard) throw new Error('expected two breadcrumb items');
    expect(home.position).toBe(1);
    expect(greenCard.position).toBe(2);
    expect(greenCard.item).toBe(`${ORIGIN}/green-card`);
  });
});

describe('BUSINESS', () => {
  it('records the confirmed founding year', () => {
    expect(BUSINESS.foundingYear).toBe(1999);
  });
});

describe('structured data in built output', () => {
  beforeAll(() => {
    assertDistIsFresh();
  });

  for (const route of ROUTES) {
    it(`${route} emits parseable ProfessionalService JSON-LD`, () => {
      const html = readDistPage(route);
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
      ];
      expect(blocks.length, 'no JSON-LD found').toBeGreaterThan(0);

      const parsed = blocks.map((m) => {
        const json = m[1];
        if (json === undefined) throw new Error('regex capture group missing');
        return JSON.parse(json) as Record<string, unknown>;
      });
      const business = parsed.find((p) => p['@type'] === 'ProfessionalService');
      expect(business, 'no ProfessionalService block').toBeTruthy();
      expect(business!.telephone).toBe('(612) 822-5747');
      expect(JSON.stringify(parsed)).not.toContain('LegalService');
    });
  }
});
