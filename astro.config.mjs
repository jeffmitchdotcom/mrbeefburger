// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  // Keystatic admin UI at /keystatic (on-demand routes, rest of the site stays static)
  integrations: [react(), keystatic()],
});
