import { config, collection, fields } from '@keystatic/core';

// Keystatic edits the same Markdown files Astro's content collections read
// (see src/content.config.ts). Field names and types here must stay in sync
// with those Zod schemas — Keystatic writes, Astro validates at build time.
export default config({
  // Local mode writes straight to disk while running `npm run dev`.
  // In production, Keystatic commits through GitHub (needs a GitHub App — see CLAUDE.md).
  // `PUBLIC_KEYSTATIC_STORAGE=github npm run dev` forces GitHub mode locally,
  // which is how the GitHub App gets created in the first place.
  storage: import.meta.env.PROD || import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github'
    ? { kind: 'github', repo: 'jeffmitchdotcom/mrbeefburger' }
    : { kind: 'local' },

  ui: {
    brand: { name: 'Mr. Beefburger' },
  },

  collections: {
    menu: collection({
      label: 'Menu Items',
      // Filename comes from the title; existing filenames are left as-is.
      slugField: 'title',
      path: 'src/content/menu/*',
      format: { contentField: 'content' },
      columns: ['category', 'price'],
      entryLayout: 'form',
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { isRequired: true } },
          slug: { label: 'Filename', description: 'Name of the Markdown file in src/content/menu/' },
        }),
        slug: fields.text({
          label: 'Cart slug',
          description: 'Identifies this item in carts and orders. Avoid changing it on a live item.',
          validation: { isRequired: true },
        }),
        price: fields.number({
          label: 'Price',
          step: 0.01,
          validation: { isRequired: true, min: 0 },
        }),
        description: fields.text({
          label: 'Description',
          multiline: true,
          validation: { isRequired: true },
        }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Burgers', value: 'burgers' },
            { label: 'Sides', value: 'sides' },
            { label: 'Drinks', value: 'drinks' },
            { label: 'Extras', value: 'extras' },
          ],
          defaultValue: 'burgers',
        }),
        toppings: fields.array(fields.text({ label: 'Topping' }), {
          label: 'Toppings',
          description: 'The customize checklist shown when adding this item to the cart.',
          itemLabel: (props) => props.value || 'New topping',
        }),
        image: fields.image({
          label: 'Image',
          directory: 'public/images/menu',
          publicPath: '/images/menu/',
          description: 'Shown 16:9 on the menu page and homepage grid.',
        }),
        signature: fields.checkbox({
          label: 'Signature item',
          description: 'Sorts first in its category on the menu page.',
        }),
        homepage: fields.checkbox({
          label: 'Show on homepage',
          description: 'Surfaces in "More from the Menu" (max 3 shown).',
        }),
        available: fields.checkbox({ label: 'Available', defaultValue: true }),
        // Menu files are frontmatter-only; this keeps them as .md with no body.
        content: fields.emptyContent({ extension: 'md' }),
      },
    }),

    locations: collection({
      label: 'Locations',
      // Filename is the location slug used by the map and order flow.
      slugField: 'name',
      path: 'src/content/locations/*',
      format: { contentField: 'content' },
      columns: ['city', 'state'],
      entryLayout: 'form',
      schema: {
        name: fields.slug({
          name: {
            label: 'Name',
            description: 'No brand prefix — "South Congress", not "Mr. Beefburger — South Congress".',
            validation: { isRequired: true },
          },
          slug: { label: 'Filename / URL slug', description: 'Avoid changing it on a live location.' },
        }),
        address: fields.text({ label: 'Street address', validation: { isRequired: true } }),
        city: fields.text({ label: 'City', validation: { isRequired: true } }),
        state: fields.text({ label: 'State', validation: { isRequired: true, length: { min: 2, max: 2 } } }),
        lat: fields.number({ label: 'Latitude', step: 0.0001, validation: { isRequired: true, min: -90, max: 90 } }),
        lng: fields.number({ label: 'Longitude', step: 0.0001, validation: { isRequired: true, min: -180, max: 180 } }),
        hours: fields.text({ label: 'Hours', validation: { isRequired: true } }),
        phone: fields.text({ label: 'Phone', validation: { isRequired: true } }),
        content: fields.emptyContent({ extension: 'md' }),
      },
    }),
  },
});
