# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MrBeefburger is a fictional full-stack burger chain website built with Astro 6. The visual direction is "modern Shake Shack meets retro diner" — cream background, bold red CTAs, warm yellow accent, uppercase display type. The site includes a complete ordering system backed by a real Neon Postgres database.

The owner has brand assets (burger names, mascot, images) that will be layered in over time; placeholder content is intentional.

## Commands

```bash
npm run dev       # start local dev server at localhost:4321
npm run build     # production build to ./dist/
npm run preview   # preview the production build locally
```

No test runner or linter is configured yet.

**Note:** The project directory was initially created as root-owned. If you hit `EACCES` errors writing files, the fix is:
```bash
sudo chown -R <username> /Users/jeffmitchell/Dev/mrbeefburger
```

## Architecture

Multi-page Astro 6 site with Vercel SSR adapter. Interactive UI is built as React islands mounted with `client:load`. No external UI libraries.

**Data flow:** All pages use `src/layouts/Layout.astro` which wraps content with `<Nav>` and `<Footer>`. Pages live in `src/pages/`. React components in `src/components/` are hydrated selectively.

**Rendering modes:** Most pages are static. Pages that read from the database (`src/pages/order/[id].astro`) and all API routes use `export const prerender = false` for SSR.

**Database:** Neon serverless Postgres, accessed via Drizzle ORM. Schema is in `src/lib/schema.ts`, client in `src/lib/db.ts`. The single `orders` table stores the full order as a JSON blob (items array) alongside flat fields (customerName, locationName, etc.).

**State management:** Nanostores with `@nanostores/persistent` for cross-page client state:
- `src/stores/cart.ts` — cart items, persisted to localStorage key `mrb-cart`
- `src/stores/location.ts` — pre-selected order location, persisted to `mrb-order-location`

**API routes:**
- `POST /api/orders` — validates and writes an order to Neon, returns `{ orderNumber }`
- `POST /api/contact` — stub endpoint, returns `{ ok: true }` (email provider not yet wired)

**Order flow:** Menu → Cart drawer → `/order` (OrderForm: location + details) → `/payment` (PaymentTheater: review + fake Pay Now) → `/order/[id]` (receipt from DB). Order summary is passed to the payment page via `sessionStorage`.

**Design system:** All brand tokens live as CSS custom properties in the `<style is:global>` block in `src/layouts/Layout.astro`. Components consume them via `var(--color-*)` and `var(--font-*)`, never hardcoded values.

```
--color-bg        #ffffff   page background
--color-surface   #f7f4f0   cards, footer, hero background (light cream)
--color-red       #DA291C   logo, headings, CTAs (In-N-Out-inspired red)
--color-yellow    #F5C200   accents, hover highlights
--color-text      #1a1a1a   body text
--color-muted     #767676   secondary text, captions
--font-display    Bricolage Grotesque (Google Fonts)
--font-body       DM Sans (Google Fonts)
```

**Nav mobile behavior:** Hamburger toggle is wired via a small inline `<script>` in `Nav.astro` that toggles an `.open` class on the `<ul>`. No JS framework involved.

## Content collections

- `src/content/menu/` — one Markdown file per menu item; fields: `slug`, `title`, `description`, `price`, `category`, `image`, `customizations` (array of add/remove options)
- `src/content/locations/` — one Markdown file per location (11 total); fields: `name`, `address`, `hours`, `lat`, `lng`; location names do NOT include the brand prefix ("South Congress", not "Mr. Beefburger — South Congress")

## Pages

| Route | File | Notes |
|---|---|---|
| `/` | `index.astro` | Hero, signatures teaser, locations teaser |
| `/menu` | `menu.astro` | Menu grouped by category; CartDrawer + LocationBanner islands |
| `/locations` | `locations.astro` | Interactive Leaflet map; "Order Now" pre-selects location |
| `/about` | `about.astro` | Gerald Beaufort Beefburger III origin story |
| `/contact` | `contact.astro` | ContactForm island + sidebar with email addresses |
| `/order` | `order.astro` | OrderForm island — location + order details, posts to `/api/orders` |
| `/payment` | `payment.astro` | PaymentTheater island — review screen + gotcha modal |
| `/order/[id]` | `order/[id].astro` | SSR receipt page; reads order from Neon by order number |

## Key component behaviors

**LocationCard** (`locations.astro` + `LocationCard.tsx`): "Order Now" button uses `e.stopPropagation()` to prevent the parent card's Leaflet flyover handler from firing. It writes to the location nanostore and navigates to `/menu`.

**OrderForm**: On mount, reads the location nanostore and skips to step 2 (details) if a location is already stored. Slug comparison normalizes `.md` suffix on both sides to avoid mismatch.

**PaymentTheater**: Reads `orderNumber` and `orderSummary` from `sessionStorage` (set by OrderForm after successful POST). Heading personalizes with customer name: "Almost there, [Name]..."

**ContactForm**: On successful POST, shows a success state with Gerald-flavored copy. The `/api/contact` endpoint is a stub — a `// TODO` comment marks where to add Resend or SMTP2GO.

## What's coming

- Wire up contact form email (Resend or SMTP2GO) — stub is at `src/pages/api/contact.ts`
- Real burger names, images, and copy from the owner
- Logo/mascot asset (replace text wordmark in Nav and Footer)
