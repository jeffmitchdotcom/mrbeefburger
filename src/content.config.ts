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

const menu = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/menu' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    price: z.number(),
    description: z.string(),
    category: z.enum(['burgers', 'sides', 'drinks']),
    toppings: z.array(z.string()).optional(),
    signature: z.boolean().optional(),
    available: z.boolean().default(true),
  }),
});

export const collections = { locations, menu };
