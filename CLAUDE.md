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

**Database:** Neon serverless Postgres, accessed via Drizzle ORM. Schema is in `src/lib/schema.ts`, client in `src/lib/db.ts`. Four tables:
- `orders` — full order as JSON blob + flat fields
- `game_scores` — playerName, score, durationSeconds
- `loyalty_members` — one row per Accord member; email is unique and is the future account key
- `loyalty_transactions` — point ledger; one row per earning/redemption event. Balance = `SUM(sauce_units)` for a given member. `sauce_units` is signed (negative for redemptions). `reference_id` is nullable text, reserved for future order number linkage.

No migration runner is configured. To add tables, run raw SQL via the Neon MCP (`mcp__Neon__run_sql`, project ID `odd-cloud-33776174`) or the Neon console, then add the matching Drizzle table definition to `schema.ts`.

**State management:** Nanostores with `@nanostores/persistent` for cross-page client state:
- `src/stores/cart.ts` — cart items, persisted to localStorage key `mrb-cart`
- `src/stores/location.ts` — pre-selected order location, persisted to `mrb-order-location`

**API routes:**
- `POST /api/orders` — validates and writes an order to Neon, returns `{ orderNumber }`
- `POST /api/contact` — stub endpoint, returns `{ ok: true }` (email provider not yet wired)
- `GET /api/game-scores` — returns top 10 scores; accepts `?clear=GBB3-great-escape-reset` to wipe all scores
- `POST /api/game-scores` — inserts a score row (playerName, score, durationSeconds)
- `POST /api/loyalty` — validates loyalty application fields, checks for duplicate email (409 if found), inserts into `loyalty_members` + seeds a 10 SU `application_signup` transaction in `loyalty_transactions`

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

- `src/content/menu/` — one Markdown file per menu item; fields: `title`, `slug`, `price`, `description`, `category` (burgers/sides/drinks), `toppings` (optional string array — the customize checklist), `image` (optional, absolute path from `/public/`), `signature` (optional bool — sorts item first in its category on the menu page), `homepage` (optional bool — surfaces item in the "More from the Menu" section on the homepage, max 3 shown), `available` (bool, default true)
- `src/content/locations/` — one Markdown file per location (11 total); fields: `name`, `address`, `city`, `state`, `lat`, `lng`, `hours`, `phone`; location names do NOT include the brand prefix ("South Congress", not "Mr. Beefburger — South Congress")

**Menu images** live in `public/images/menu/`. Add `image: /images/menu/filename.png` to a menu item's frontmatter to display it on the menu page (16:9 yellow-bordered box) and homepage grid.

## Pages

| Route | File | Notes |
|---|---|---|
| `/` | `index.astro` | Hero slider, category icons, featured burger, dynamic "More from the Menu" (homepage: true items), locations teaser |
| `/menu` | `menu.astro` | Menu grouped by category; CartDrawer + LocationBanner islands |
| `/locations` | `locations.astro` | Interactive Leaflet map + geolocation sort; "Order Now" pre-selects location |
| `/about` | `about.astro` | Gerald Beaufort Beefburger III origin story + ProjectAttribution section |
| `/contact` | `contact.astro` | ContactForm island + sidebar with email addresses |
| `/order` | `order.astro` | OrderForm island — location + order details, posts to `/api/orders` |
| `/payment` | `payment.astro` | PaymentTheater island — review screen + gotcha modal |
| `/order/[id]` | `order/[id].astro` | SSR receipt page; reads order from Neon by order number + ProjectAttribution |
| `/loyalty` | `loyalty.astro` | The Beefburger Loyalty Accord — Sauce Units explainer, tier system, perks accordion, application form wired to `/api/loyalty` |
| `/game` | `game.astro` | "Mr. Beefburger's Great Escape" sidescroller; noindex, not in nav |

## Key component behaviors

**LocationCard** (`locations.astro` + `LocationCard.tsx`): "Order Now" button uses `e.stopPropagation()` to prevent the parent card's Leaflet flyover handler from firing. It writes to the location nanostore and navigates to `/menu`.

**OrderForm**: On mount, reads the location nanostore and skips to step 2 (details) if a location is already stored. Slug comparison normalizes `.md` suffix on both sides to avoid mismatch.

**PaymentTheater**: Reads `orderNumber` and `orderSummary` from `sessionStorage` (set by OrderForm after successful POST). Heading personalizes with customer name: "Almost there, [Name]..."

**ContactForm**: On successful POST, shows a success state with Gerald-flavored copy. The `/api/contact` endpoint is a stub — a `// TODO` comment marks where to add Resend or SMTP2GO.

**BeefburgerGame** (`game.astro` + `BeefburgerGame.tsx`): Canvas sidescroller. Sprite sheets in `public/sprites/` use magenta (#FF00FF) chroma key for transparency. Frame coordinates are marked `// TUNE` for easy adjustment if sprites change. Leaderboard reads/writes via `/api/game-scores`. Secret reset URL: `/api/game-scores?clear=GBB3-great-escape-reset`.

**ProjectAttribution** (`src/components/ProjectAttribution.astro`): Single source of truth for the byline, description, and tech stack badges shown on the receipt page and about page. Edit this one file to update either location.

**OrderForm** (step 1): The pickup/dine-in toggle and "Continue" button are `position: fixed` to the viewport bottom so they stay visible while the user scrolls the location list.

**Loyalty application** (`loyalty.astro` + `/api/loyalty`): All fields are required (HTML native validation). The burger dropdown is filtered to `category === 'burgers'` only, sorted so `signature: true` items (Meaty Faced Sauce Burger) appear first. On submit, the form POSTs JSON to `/api/loyalty`. Duplicate emails return a 409 — the client surfaces a distinct snarky error message for duplicates vs. a generic server failure. On success, `loyalty_members` gets the member row and `loyalty_transactions` gets a `+10 SU` signup event. The transaction ledger pattern means future point-earning actions (Tuesday bonus, ordering the signature burger, referrals) are each their own row — balance is always `SUM(sauce_units)`, never a stored running total.

## What's coming

- Wire up contact form email (Resend or SMTP2GO) — stub is at `src/pages/api/contact.ts`
- Food photography for remaining menu items (drop in `public/images/menu/`, add `image:` to frontmatter)
- Logo/mascot asset (replace text wordmark in Nav and Footer)
- Login system — `loyalty_members.email` is the intended account key; `loyalty_transactions.reference_id` is reserved for linking order numbers so members can see their full point history
- Additional point-earning actions wired into existing flows (e.g. crediting SU on order completion, Tuesday bonus detection)
