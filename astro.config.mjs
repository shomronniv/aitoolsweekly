import { defineConfig } from 'astro/config';

// Static output — no adapter needed for Netlify static hosting.
// The netlify.toml handles build + publish configuration.
export default defineConfig({
  output: 'static',
  site: 'https://aitoolsweekly.com',
});
