import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

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
    category: z.enum(['burgers', 'sides', 'drinks', 'extras']),
    toppings: z.array(z.string()).optional(),
    image: z.string().optional(),
    signature: z.boolean().optional(),
    homepage: z.boolean().optional(),
    available: z.boolean().default(true),
  }),
});

// Single-entry collection backing the Keystatic "Project Attribution" singleton.
// The file is one object, so the parser wraps it as an entry with id 'attribution'.
const site = defineCollection({
  loader: file('src/content/site/attribution.json', {
    parser: (text) => [{ id: 'attribution', ...JSON.parse(text) }],
  }),
  schema: z.object({
    author: z.string(),
    url: z.string().url(),
    description: z.string(),
    technologies: z.array(
      z.object({
        name: z.string(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      }),
    ),
  }),
});

export const collections = { locations, menu, site };
