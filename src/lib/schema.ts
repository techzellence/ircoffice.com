// Machine-readable business data for search engines. Values here MUST stay
// byte-identical to what the pages render and to the client's Google Business
// Profile — mismatched name/address/phone actively harms local ranking.

export interface BusinessInfo {
  name: string;
  telephone: string;
  email: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
  latitude: number;
  longitude: number;
  foundingYear: number;
}

export const BUSINESS: BusinessInfo = {
  name: 'Immigrant Resource Center',
  telephone: '(612) 822-5747',
  email: 'info@ircoffice.com',
  streetAddress: '1 W Lake St Ste #165',
  addressLocality: 'Minneapolis',
  addressRegion: 'MN',
  postalCode: '55408',
  addressCountry: 'US',
  latitude: 44.948306738076035,
  longitude: -93.27877182892344,
  foundingYear: 1999,
};

export interface Crumb {
  name: string;
  path: string;
}

/**
 * ProfessionalService — deliberately NOT LegalService. IRC is a non-attorney
 * practice; LegalService would assert otherwise to every consumer of this data.
 */
export function professionalServiceSchema(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${origin}/#business`,
    name: BUSINESS.name,
    url: `${origin}/`,
    image: `${origin}/og-card.png`,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    foundingDate: String(BUSINESS.foundingYear),
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '10:00',
        closes: '17:00',
      },
    ],
    areaServed: {
      '@type': 'City',
      name: 'Minneapolis',
    },
  };
}

export function breadcrumbSchema(
  origin: string,
  crumbs: readonly Crumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path === '/' ? '/' : crumb.path}`,
    })),
  };
}
