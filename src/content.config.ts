import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const locations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/locations' }),
  schema: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    lat: z.number(),
    lng: z.number(),
    hours: z.string(),
    phone: z.string(),
  }),
});

export const collections = { locations };
