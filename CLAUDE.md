# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MrBeefburger is a fictional futuristic-retro burger chain website built with Astro 6. The visual direction is "modern Shake Shack meets retro diner" — dark backgrounds, warm yellow accent, bold uppercase display type. The owner has brand assets (burger names, mascot, images) that will be layered in over time; placeholder content is intentional.

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

Single-page Astro site with no framework integrations (vanilla Astro + scoped CSS only). No external UI libraries.

**Data flow:** `index.astro` → `Layout.astro` wraps every page with `<Nav>` and `<Footer>`. All pages live in `src/pages/` and use the shared layout.

**Design system:** All brand tokens live as CSS custom properties in the `<style is:global>` block in `src/layouts/Layout.astro`. When real brand colors or fonts arrive, update the `:root` variables there — components consume them via `var(--color-*)` and `var(--font-*)`, never hardcoded values.

```
--color-bg        #ffffff   page background (white)
--color-surface   #f7f4f0   cards, footer, hero background (light cream)
--color-red       #DA291C   logo, headings, CTAs, borders (In-N-Out-inspired red)
--color-yellow    #F5C200   accents, icon tile backgrounds, hover highlights
--color-text      #1a1a1a   body text
--color-muted     #767676   secondary text, captions
--font-display    Bricolage Grotesque (Google Fonts — bold variable grotesque for headings/logo)
--font-body       DM Sans (Google Fonts — clean geometric sans for body/UI)
```

**Nav mobile behavior:** The hamburger toggle is wired via a small inline `<script>` in `Nav.astro` that toggles an `.open` class on the `<ul>`. No JS framework involved.

## Content status

Homepage sections are scaffolded with placeholder copy:
- **Hero** — headline, subheadline, "See the Menu" CTA
- **Our Signatures** — 3 placeholder burger cards (hatched image slot, name, description)
- **Locations teaser** — one-liner + "Find a Location" link

Pages linked in the nav (`/menu`, `/about`, `/locations`, `/contact`) do not exist yet — they will 404 until created.

## What's coming

- Real burger names, images, and copy from the owner
- Logo/mascot asset (replace text wordmark in Nav and Footer)
- Brand font stack (replace `--font-display` in Layout)
- Individual pages for Menu, About, Locations, Contact
