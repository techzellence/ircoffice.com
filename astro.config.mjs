import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import { checkBuildEnv } from './src/lib/build-env.ts';

/**
 * Stops a production Pages build that would ship contact forms nobody can submit, and logs the
 * softer problems. See src/lib/build-env.ts.
 */
const requireProductionEnv = {
  name: 'ircoffice:require-production-env',
  hooks: {
    'astro:config:setup': ({ logger }) => {
      const { errors, warnings } = checkBuildEnv(process.env);
      for (const warning of warnings) logger.warn(warning);
      if (errors.length > 0) throw new Error(errors.join('\n'));
    },
  },
};

export default defineConfig({
  site: 'https://www.ircoffice.com',
  output: 'static',
  build: {
    format: 'file',
  },
  integrations: [requireProductionEnv, sitemap()],
});
