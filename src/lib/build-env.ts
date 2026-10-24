// Build-time checks for the public variables Cloudflare Pages compiles into the HTML.
//
// The site once went to production with no PUBLIC_TURNSTILE_SITE_KEY: every contact form
// rendered a widget with no sitekey, no visitor could get a token, and every submission was
// rejected. Nothing failed loudly, so nobody noticed. A production build now refuses to ship
// without the key.

/** Cloudflare Pages' production branch for this project. */
const PRODUCTION_BRANCH = 'main';

export interface BuildEnvReport {
  /** Problems that must stop the build. */
  errors: string[];
  /** Problems worth a line in the build log. */
  warnings: string[];
}

function isMissing(value: string | undefined): boolean {
  return value === undefined || value.trim() === '' || value === 'undefined';
}

export function checkBuildEnv(env: Readonly<Record<string, string | undefined>>): BuildEnvReport {
  const report: BuildEnvReport = { errors: [], warnings: [] };

  // Local builds read .env through Vite, which this check can't see; only Pages builds count.
  if (env.CF_PAGES !== '1') return report;

  const production = env.CF_PAGES_BRANCH === PRODUCTION_BRANCH;

  if (isMissing(env.PUBLIC_TURNSTILE_SITE_KEY)) {
    const message =
      'PUBLIC_TURNSTILE_SITE_KEY is not set, so no contact form can be submitted. Add it under ' +
      'Pages → Settings → Variables and Secrets, then retry the deployment.';
    (production ? report.errors : report.warnings).push(message);
  }

  if (isMissing(env.PUBLIC_CF_BEACON_TOKEN)) {
    report.warnings.push(
      'PUBLIC_CF_BEACON_TOKEN is not set, so the Web Analytics beacon is left out of this build.',
    );
  }

  return report;
}
