import { describe, expect, it } from 'vitest';

import { getSiteName } from '../../src/lib/version';

describe('getSiteName', () => {
  it('returns the site name', () => {
    expect(getSiteName()).toBe('Immigrant Resource Center');
  });
});
