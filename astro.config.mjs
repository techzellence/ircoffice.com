import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.ircoffice.com',
  output: 'static',
  build: {
    format: 'file',
  },
  integrations: [sitemap()],
});
