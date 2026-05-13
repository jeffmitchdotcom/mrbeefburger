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

**Rendering modes:** Most pages are static. Pages that read from the database (`src/pages/order/[id].astro`, `src/pages/account.astro`) and all API routes use `export const prerender = false` for SSR.

**Database:** Neon serverless Postgres, accessed via Drizzle ORM. Schema is in `src/lib/schema.ts`, client in `src/lib/db.ts`. Eight tables:
- `orders` — full order as JSON blob + flat fields; includes `customer_email` (nullable) for order history lookups
- `game_scores` — playerName, score, durationSeconds
- `loyalty_members` — one row per Accord member; email is unique and is the account key
- `loyalty_transactions` — point ledger; one row per earning/redemption event. Balance = `SUM(sauce_units)` for a given member. `sauce_units` is signed (negative for redemptions). `reference_id` is nullable text for order number linkage.
- `user` — Better Auth core user table (id, name, email, emailVerified, createdAt, updatedAt)
- `session` — Better Auth session table (token, userId FK, expiresAt)
- `account` — Better Auth account table (accountId, providerId, userId FK)
- `verification` — Better Auth OTP/verification token table (identifier, value, expiresAt)

No migration runner is configured. To add tables, run raw SQL via the Neon MCP (`mcp__Neon__run_sql`, project ID `odd-cloud-33776174`) or the Neon console, then add the matching Drizzle table definition to `schema.ts`.

**Auth system:** Passwordless OTP sign-in via [Better Auth](https://better-auth.com). No passwords, no social login. User enters email → receives 6-digit code via Amazon SES → enters code → signed in. Server config in `src/lib/auth.ts` uses the `drizzleAdapter` (not a Pool connection — Neon's WebSocket Pool is unsupported in Vercel SSR functions). Client helper in `src/lib/auth-client.ts`. All `/api/auth/*` traffic is handled by the catch-all route `src/pages/api/auth/[...all].ts`.

**Install note:** `npm install better-auth` requires `--legacy-peer-deps` due to an optional peer dep conflict with `@lynx-js/react`. Same flag required for `react`, `react-dom`, and their types if reinstalling.

**State management:** Nanostores with `@nanostores/persistent` for cross-page client state:
- `src/stores/cart.ts` — cart items, persisted to localStorage key `mrb-cart`
- `src/stores/location.ts` — pre-selected order location, persisted to `mrb-order-location`

**API routes:**
- `POST /api/orders` — validates and writes an order to Neon, returns `{ orderNumber }`; also stores `customerEmail`, credits Sauce Units non-fatally if email matches a loyalty member (1 SU per $1, floor), and sends a Gerald-voiced order confirmation email via SES non-fatally
- `ALL /api/auth/[...all]` — catch-all route; hands all Better Auth traffic to `auth.handler(request)`
- `GET /api/loyalty/check` — takes `?email=x`, returns `{ isMember: boolean }` only (no balance, no PII)
- `GET /api/account/name-lookup` — checks `loyalty_members.name` then most recent `orders.customer_name` for an email; returns `{ name: string | null }`; used by AccountIsland on first sign-in
- `POST /api/contact` — stub endpoint, returns `{ ok: true }` (email provider not yet wired)
- `GET /api/game-scores` — returns top 10 scores; accepts `?clear=GBB3-great-escape-reset` to wipe all scores
- `POST /api/game-scores` — inserts a score row (playerName, score, durationSeconds)
- `POST /api/loyalty` — validates loyalty application fields, checks for duplicate email (409 if found), inserts into `loyalty_members` + seeds a 10 SU `application_signup` transaction in `loyalty_transactions`

**Order flow:** Menu → Cart drawer → `/order` (OrderForm: location + details, **email required**; saves full order payload to `sessionStorage`, no API call) → `/payment` (PaymentTheater: reads summary from `sessionStorage`, shows loyalty banner; **Pay Now** POSTs to `/api/orders`, credits SU, sends confirmation email, then shows gotcha modal) → `/order/[id]` (receipt from DB). The order is not created in the database until Pay Now is clicked.

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

**Nav mobile behavior:** Hamburger toggle is wired via a small inline `<script>` in `Nav.astro` that toggles an `.open` class on the `<ul>`. No JS framework involved. Mobile breakpoint is `768px`. The `nav-actions` cluster (AuthButton + hamburger) is always visible at all widths — nav links collapse into the hamburger on mobile.

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
| `/order` | `order.astro` | SSR; checks Better Auth session, passes `user` prop to OrderForm. OrderForm collects location + details (email required); saves to `sessionStorage` and navigates to `/payment` — no API call here |
| `/payment` | `payment.astro` | PaymentTheater island — loyalty status banner + review screen; **Pay Now** makes the POST to `/api/orders`, then shows the gotcha modal |
| `/order/[id]` | `order/[id].astro` | SSR receipt page; reads order from Neon by order number + ProjectAttribution |
| `/loyalty` | `loyalty.astro` | The Beefburger Loyalty Accord — Sauce Units explainer, tier system, perks accordion, application form wired to `/api/loyalty` |
| `/account` | `account.astro` | SSR; checks Better Auth session. Unauthenticated: OTP login form (AccountIsland). Authenticated: dashboard with loyalty card, SU balance, transaction ledger, order history, sign out |
| `/game` | `game.astro` | "Mr. Beefburger's Great Escape" sidescroller; noindex, not in nav |

## Key component behaviors

**LocationCard** (`locations.astro` + `LocationCard.tsx`): "Order Now" button uses `e.stopPropagation()` to prevent the parent card's Leaflet flyover handler from firing. It writes to the location nanostore and navigates to `/menu`.

**OrderForm**: On mount, reads the location nanostore and skips to step 2 (details) if a location is already stored. Slug comparison normalizes `.md` suffix on both sides to avoid mismatch. Receives an optional `user` prop from `order.astro` (server-side session check); signed-in users see a locked "Ordering as / name / email" display block instead of the name and email inputs, with a "Not you? →" link to `/account`. The step 2 button is labeled "Review Order →" — clicking it saves the full order payload to `sessionStorage` (including `locationSlug`, `pickupTime`, `specialRequests`) and navigates to `/payment`. No API call happens here.

**PaymentTheater**: On mount, reads `orderSummary` from `sessionStorage` and fetches `/api/loyalty/check?email=x`. Shows a loyalty status banner — yellow-tinted for members (with SU preview: "This order earns you X Sauce Units"), cream for non-members. Heading personalizes with customer name. **Pay Now** makes the `POST /api/orders` call; on success, stores the returned `orderNumber` in `sessionStorage` and shows the gotcha modal. The modal's "See My Order Anyway →" link uses the live order number. Shows a loading state ("One moment...") and error message on the button if the API call fails.

**ContactForm**: On successful POST, shows a success state with Gerald-flavored copy. The `/api/contact` endpoint is a stub — a `// TODO` comment marks where to add Resend or SMTP2GO.

**AuthButton** (`src/components/AuthButton.tsx`): Minimal React island mounted with `client:only="react"` (not `client:load` — avoids SSR hook errors). Uses `useEffect` + `authClient.getSession()`. Shows a LogIn arrow SVG when signed out (links to `/account`), User silhouette SVG when signed in. Lives in the persistent `nav-actions` cluster alongside the hamburger — visible on both desktop and mobile at all breakpoints.

**AccountIsland** (`src/components/AccountIsland.tsx`): Two states driven by the `user` prop passed from the server. Unauthenticated: email → "Send Code" → OTP → sign in. On first sign-in, name is resolved from `loyalty_members` then `orders` via `/api/account/name-lookup`; if not found, a name field appears on the form. Sign-in calls `authClient.signIn.emailOtp({ email, otp })` — NOT `emailOtp.verifyEmail` (that's for email verification flows, not sign-in). Authenticated: Sauce Units card + tier badge (if loyalty member), prompt to join (if not), transaction ledger, order history, sign out.

**BeefburgerGame** (`game.astro` + `BeefburgerGame.tsx`): Canvas sidescroller. Sprite sheets in `public/sprites/` use magenta (#FF00FF) chroma key for transparency. Frame coordinates are marked `// TUNE` for easy adjustment if sprites change. Leaderboard reads/writes via `/api/game-scores`. Secret reset URL: `/api/game-scores?clear=GBB3-great-escape-reset`.

**ProjectAttribution** (`src/components/ProjectAttribution.astro`): Single source of truth for the byline, description, and tech stack badges shown on the receipt page and about page. Edit this one file to update either location.

**OrderForm** (step 1): The pickup/dine-in toggle and "Continue" button are `position: fixed` to the viewport bottom so they stay visible while the user scrolls the location list.

**Loyalty application** (`loyalty.astro` + `/api/loyalty`): All fields are required (HTML native validation). The burger dropdown is filtered to `category === 'burgers'` only, sorted so `signature: true` items (Meaty Faced Sauce Burger) appear first. On submit, the form POSTs JSON to `/api/loyalty`. Duplicate emails return a 409 — the client surfaces a distinct snarky error message for duplicates vs. a generic server failure. On success, `loyalty_members` gets the member row and `loyalty_transactions` gets a `+10 SU` signup event. The transaction ledger pattern means future point-earning actions (Tuesday bonus, ordering the signature burger, referrals) are each their own row — balance is always `SUM(sauce_units)`, never a stored running total.

## What's coming

- Wire up contact form email (Resend or SMTP2GO) — stub is at `src/pages/api/contact.ts`
- Food photography for remaining menu items (drop in `public/images/menu/`, add `image:` to frontmatter)
- Logo/mascot asset (replace text wordmark in Nav and Footer)
- Additional point-earning actions (Tuesday bonus, referrals, ordering the signature burger — each would be a new `loyalty_transactions` row)
