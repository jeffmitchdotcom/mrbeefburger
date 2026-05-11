# Mr. Beefburger

A fictional full-stack burger chain website built as a portfolio/demo project. Fake brand, real tech — real database, real deploys, zero actual burgers.

Live at **[mrbeefburger.com](https://mrbeefburger.com)**

---

## What it is

Mr. Beefburger is a fictional "futuristic-retro" burger chain. The site includes a full ordering flow: browse the menu, pick a location, customize your order, place it (saved to a real Postgres database), and land on a shareable receipt page. The "Pay Now" button reveals a gotcha modal — this isn't a real restaurant.

Built to showcase a modern Astro stack with server-side rendering, persistent client state, and a real database backend.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | [Astro 6](https://astro.build) with Vercel SSR adapter |
| UI components | React (islands via `client:load`) |
| State management | [Nanostores](https://github.com/nanostores/nanostores) + `@nanostores/persistent` |
| Database | [Neon](https://neon.tech) serverless Postgres |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Hosting | [Vercel](https://vercel.com) |
| Map | Leaflet.js (locations page) |
| Fonts | Bricolage Grotesque + DM Sans (Google Fonts) |

## Features

- **Menu** — content collection of items with food photography, toppings customization, and per-item `homepage` / `signature` flags
- **Cart** — persistent cart drawer with quantity controls, stored in localStorage via nanostores
- **Location selection** — interactive Leaflet map with geolocation sort; "Order Now" pre-selects a location across the order flow
- **Order flow** — multi-step form (location → details → review), writes to Neon Postgres via Drizzle
- **Payment theater** — personalized review screen; Pay Now reveals a gotcha modal
- **Receipt page** — shareable `/order/[id]` page pulled from the database; includes estimated wait time and tech stack attribution
- **Loyalty program** — "The Beefburger Loyalty Accord" at `/loyalty`: Sauce Units currency, four membership tiers, perks accordion, and an application form that writes to a real Neon Postgres table. Duplicate email detection returns a Gerald-flavored error. Points are tracked in a transaction ledger (`loyalty_transactions`) so full earning history is queryable — designed to connect to a future login system
- **Contact form** — stubbed API endpoint ready for Resend/SMTP2GO wiring
- **About page** — outlandish origin story of Gerald Beaufort Beefburger III, with tech attribution section
- **Locations page** — interactive map with all 11 locations and geolocation-based nearest sort
- **Browser game** — "Mr. Beefburger's Great Escape" canvas sidescroller at `/game` (not in nav); Neon-backed leaderboard

## Running locally

```bash
npm install
npm run dev       # localhost:4321
npm run build     # production build to ./dist/
npm run preview   # preview production build
```

Requires a `.env` file with:

```
DATABASE_URL=your_neon_connection_string
```

## Project structure

```
src/
├── components/       # React islands + Astro components
│   ├── BeefburgerGame.tsx    # Canvas sidescroller game
│   ├── CartDrawer.tsx
│   ├── ContactForm.tsx
│   ├── LocationBanner.tsx
│   ├── LocationCard.tsx
│   ├── MenuItemCard.tsx
│   ├── MenuSection.astro
│   ├── Nav.astro
│   ├── OrderForm.tsx
│   ├── PaymentTheater.tsx
│   └── ProjectAttribution.astro  # Shared byline + tech stack (receipt + about)
├── content/
│   ├── menu/         # Menu items as Markdown content collection
│   └── locations/    # Location data as Markdown content collection
├── layouts/
│   └── Layout.astro  # Shared layout with Nav, Footer, global CSS tokens
├── lib/
│   ├── db.ts         # Drizzle + Neon client
│   └── schema.ts     # orders, game_scores, loyalty_members, loyalty_transactions
├── pages/
│   ├── api/
│   │   ├── orders.ts       # POST — saves order to Neon
│   │   ├── contact.ts      # POST — stub, ready for email provider
│   │   ├── game-scores.ts  # GET top 10 / POST score / GET?clear=... to reset
│   │   └── loyalty.ts      # POST — saves loyalty application, seeds 10 SU transaction
│   ├── order/
│   │   └── [id].astro  # SSR receipt page (reads from DB by order number)
│   ├── about.astro
│   ├── contact.astro
│   ├── game.astro      # Game page (noindex, not in nav)
│   ├── index.astro
│   ├── locations.astro
│   ├── loyalty.astro   # The Beefburger Loyalty Accord
│   ├── menu.astro
│   ├── order.astro
│   └── payment.astro
└── stores/
    ├── cart.ts         # Persistent cart state (localStorage)
    └── location.ts     # Persistent pre-selected location state (localStorage)
```

---

Built by [Jeff Mitchell](https://jeffmitch.com) · [jeffmitch.com](https://jeffmitch.com)
