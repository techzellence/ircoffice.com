import { describe, expect, it } from 'vitest';

import { checkBuildEnv } from '../../src/lib/build-env';

const PRODUCTION = { CF_PAGES: '1', CF_PAGES_BRANCH: 'main' };
const PREVIEW = { CF_PAGES: '1', CF_PAGES_BRANCH: 'fix/some-branch' };
const KEYS = { PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA', PUBLIC_CF_BEACON_TOKEN: 'abc123' };

describe('checkBuildEnv', () => {
  it('fails a production build that has no Turnstile site key', () => {
    // Shipped once: every form rendered without a sitekey and every submission got a 403.
    const { errors } = checkBuildEnv({ ...PRODUCTION, PUBLIC_CF_BEACON_TOKEN: 'abc123' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('PUBLIC_TURNSTILE_SITE_KEY');
  });

  it('treats an empty or literal "undefined" value as missing', () => {
    for (const value of ['', '  ', 'undefined']) {
      const env = { ...PRODUCTION, ...KEYS, PUBLIC_TURNSTILE_SITE_KEY: value };
      const { errors } = checkBuildEnv(env);
      expect(errors).toHaveLength(1);
    }
  });

  it('only warns about a missing analytics token, even in production', () => {
    const { errors, warnings } = checkBuildEnv({
      ...PRODUCTION,
      PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA',
    });
    expect(errors).toHaveLength(0);
    expect(warnings.join(' ')).toContain('PUBLIC_CF_BEACON_TOKEN');
  });

  it('only warns on a preview build', () => {
    const { errors, warnings } = checkBuildEnv(PREVIEW);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(2);
  });

  it('stays quiet on a fully configured production build', () => {
    expect(checkBuildEnv({ ...PRODUCTION, ...KEYS })).toEqual({ errors: [], warnings: [] });
  });

  it('stays quiet on a local build, which uses .env instead', () => {
    expect(checkBuildEnv({})).toEqual({ errors: [], warnings: [] });
  });
});
