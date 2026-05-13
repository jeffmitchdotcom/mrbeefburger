# Mr. Beefburger

A fictional full-stack burger chain website built as a portfolio/demo project. Fake brand, real tech — real database, real deploys, zero actual burgers.

Live at **[mrbeefburger.com](https://mrbeefburger.com)**

---

## Why I built it

Most portfolio projects stop at the interesting part. They demo a UI, mock the backend, and call it done. I wanted to build something that goes all the way through — real database, real auth, real emails, real deploys — so there's nothing to hand-wave when someone asks how it actually works.

The fictional brand was a deliberate choice. "Mr. Beefburger" gave me room to build a complete, production-like system (multi-step ordering, a loyalty program with a transaction ledger, passwordless sign-in, automated emails) without the constraints of a real business. It also made it more fun to use. Gerald's personality runs through the copy, the error messages, the verification emails — it's a reminder that the technical choices and the product experience are the same decision.

Every tool in the stack was chosen because it's what I'd reach for on a real project: Neon for serverless Postgres, Drizzle for type-safe queries, Better Auth for passwordless OTP, Amazon SES for transactional email, Vercel for deployment. No mocks, no stubs where it counted.

## What it is

Mr. Beefburger is a fictional "futuristic-retro" burger chain. The site includes a full ordering flow: browse the menu, pick a location, customize your order, place it (saved to a real Postgres database), and land on a shareable receipt page. The "Pay Now" button reveals a gotcha modal — this isn't a real restaurant.

Built to showcase a modern Astro stack with server-side rendering, persistent client state, and a real database backend.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | [Astro 6](https://astro.build) with Vercel SSR adapter |
| UI components | React (islands via `client:load` / `client:only`) |
| State management | [Nanostores](https://github.com/nanostores/nanostores) + `@nanostores/persistent` |
| Database | [Neon](https://neon.tech) serverless Postgres |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [Better Auth](https://better-auth.com) — passwordless OTP via email |
| Email | [Amazon SES](https://aws.amazon.com/ses/) — order confirmations + OTP codes |
| Hosting | [Vercel](https://vercel.com) |
| Map | Leaflet.js (locations page) |
| Fonts | Bricolage Grotesque + DM Sans (Google Fonts) |

## Features

- **Menu** — content collection of items with food photography, toppings customization, and per-item `homepage` / `signature` flags
- **Cart** — persistent cart drawer with quantity controls, stored in localStorage via nanostores
- **Location selection** — interactive Leaflet map with geolocation sort; "Order Now" pre-selects a location across the order flow
- **Order flow** — multi-step form (location → details → review), writes to Neon Postgres via Drizzle; email required; confirmation email sent via SES
- **Payment theater** — loyalty status banner (member vs. join prompt), personalized review screen; Pay Now reveals a gotcha modal
- **Receipt page** — shareable `/order/[id]` page pulled from the database; includes estimated wait time and tech stack attribution
- **Loyalty program** — "The Beefburger Loyalty Accord" at `/loyalty`: Sauce Units currency, four membership tiers, perks accordion, and an application form that writes to Neon. Points tracked in a transaction ledger (`loyalty_transactions`). Sauce Units credited automatically on orders placed with a matching email
- **Account dashboard** — `/account` with passwordless OTP sign-in (email → 6-digit code via SES → signed in, no password). Dashboard shows Sauce Units balance + tier, transaction history, and full order history linked by email. Name resolved from loyalty/order records on first sign-in
- **Contact form** — stubbed API endpoint ready for email provider wiring
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
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
SES_FROM_EMAIL=noreply@yourdomain.com
BETTER_AUTH_SECRET=your_secret_32_chars_min
BETTER_AUTH_URL=http://localhost:4321
```

> `BETTER_AUTH_SECRET`: generate with `openssl rand -base64 32`. Set `BETTER_AUTH_URL` to the deployed URL in Vercel env vars.

## Project structure

```
src/
├── components/       # React islands + Astro components
│   ├── AccountIsland.tsx     # OTP login form + account dashboard
│   ├── AuthButton.tsx        # Nav auth icon (sign in / account)
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
│   ├── auth.ts       # Better Auth server config (drizzle adapter, emailOTP plugin)
│   ├── auth-client.ts  # Better Auth client helper (emailOTPClient plugin)
│   ├── db.ts         # Drizzle + Neon client
│   ├── email.ts      # Amazon SES sendEmail() wrapper
│   └── schema.ts     # All 8 tables: orders, game_scores, loyalty_members, loyalty_transactions, + 4 Better Auth tables
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...all].ts  # Better Auth catch-all handler
│   │   ├── account/
│   │   │   └── name-lookup.ts  # GET — resolve name from loyalty/orders by email
│   │   ├── loyalty/
│   │   │   └── check.ts     # GET — returns { isMember: boolean } for an email
│   │   ├── orders.ts        # POST — saves order, credits SU, sends confirmation email
│   │   ├── contact.ts       # POST — stub, ready for email provider
│   │   ├── game-scores.ts   # GET top 10 / POST score / GET?clear=... to reset
│   │   └── loyalty.ts       # POST — saves loyalty application, seeds 10 SU transaction
│   ├── order/
│   │   └── [id].astro   # SSR receipt page (reads from DB by order number)
│   ├── about.astro
│   ├── account.astro    # SSR account page — OTP login or dashboard
│   ├── contact.astro
│   ├── game.astro       # Game page (noindex, not in nav)
│   ├── index.astro
│   ├── locations.astro
│   ├── loyalty.astro    # The Beefburger Loyalty Accord
│   ├── menu.astro
│   ├── order.astro
│   └── payment.astro
└── stores/
    ├── cart.ts          # Persistent cart state (localStorage)
    └── location.ts      # Persistent pre-selected location state (localStorage)
```

---

Built by [Jeff Mitchell](https://jeffmitch.com) · [jeffmitch.com](https://jeffmitch.com)
