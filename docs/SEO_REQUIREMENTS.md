# SEO Requirements

This document outlines the Search Engine Optimization (SEO) strategy, policies, and technical guidelines for the public website of Sristy-Dristy Bike House (Sristy-Dristy Enterprise).

## Core Principles & Disclaimer

1. **No Ranking Guarantee:** Technical SEO optimization improves accessibility, crawlability, and rich indexing, but does not guarantee specific search engine ranking positions.
2. **Robots.txt is Not Security:** `robots.txt` instructions guide web crawlers on which URLs to fetch; they do not restrict access or protect sensitive information. Private routes must be secured exclusively by server-side authentication and authorization.
3. **Canonical and Public Only:** Sitemaps must contain only canonical, publicly accessible URLs that return HTTP 200 OK. Dynamic or placeholder routes returning 404/500 or requiring login must never be included.
4. **Authentic Data Only:** Structured data (JSON-LD), reviews, ratings, inventory counts, and price offers must reflect actual, verified database states. Generating fake reviews, artificial aggregate ratings, or misleading inventory badges is strictly forbidden.

---

## Technical SEO Architecture

### 1. Server-Rendered Public Content
- All public pages (Homepage, Bike Inventory Catalogue, Bike Detail Pages, Public Offers, Sell/Request Forms, Contact Page) are rendered server-side via Next.js Server Components.
- Search engine crawlers receive fully rendered HTML on the initial HTTP response without relying on client-side JavaScript execution.

### 2. Site Configuration & Metadata Control (`src/lib/site-config.ts`)
- Site URL and indexing flags are managed through explicit server-side environment variables:
  - `SITE_URL`: Absolute origin URL (e.g., `https://sristydristy.com`). Defaults to `http://localhost:3000` in local development.
  - `SITE_INDEXING_ENABLED`: Boolean string (`"true"` / `"false"`). Defaults to `"false"`.
- **Environment Safety Rule:** When `SITE_INDEXING_ENABLED` is set to `"true"`, the system validates `SITE_URL`. If `SITE_URL` is missing, invalid, or set to `localhost`/`127.0.0.1`, server boot or build fails explicitly to prevent indexing improper or local URLs.

### 3. Dynamic Metadata API (`src/app/layout.tsx` & Page Components)
- Every public page defines metadata using Next.js Metadata API:
  - `metadataBase`: Configured from validated `siteConfig`.
  - `title`: Page-specific title with standard template fallback (`%s | Sristy-Dristy Bike House`).
  - `description`: Unique, descriptive meta description (150-160 characters).
  - `alternates.canonical`: Self-referential canonical URL for standard pages.
  - `openGraph`: Standardized Open Graph properties (title, description, siteName, url, type `website` or `article`).
  - `twitter`: Summary card metadata.
  - `robots`: Driven by `SITE_INDEXING_ENABLED` (`index: true/false`, `follow: true/false`).

### 4. Automated Robots Handler (`src/app/robots.ts`)
- Generates `/robots.txt` dynamically based on configuration:
  - When `SITE_INDEXING_ENABLED` is `false`: Disallows all user agents across all paths (`Disallow: /`).
  - When `SITE_INDEXING_ENABLED` is `true`: Allows public routes, explicitly disallows `/admin/` and `/api/`, and includes the absolute URL to `/sitemap.xml`.

### 5. Automated Sitemap Generator (`src/app/sitemap.ts`)
- Generates `/sitemap.xml` listing only valid, canonical public pages.
- In Phase 0.5, includes only verified existing public routes (`/`).
- In Phase 8 (Public Showroom), dynamic bike listing URLs (`/bikes/[id]`) will be populated directly from active `AVAILABLE` bikes in the database.

---

## On-Page SEO & Content Guidelines

### 1. Heading Hierarchy & HTML Semantics
- Exactly one `<h1>` tag per page representing the main page topic.
- Logical heading hierarchy (`<h1>` -> `<h2>` -> `<h3>`) without skipping levels.
- Use semantic HTML5 structural tags (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`).

### 2. Image Optimization & Alt Text
- All images utilize Next.js `<Image>` component with explicit `width` and `height` (or `fill` with responsive `sizes`).
- Mandatory descriptive `alt` attribute for all public bike images (e.g., `"Yamaha FZ-S V3 Vintage Blue 2021 pre-owned motorcycle"`).
- Decorative images must use `alt=""` or `aria-hidden="true"`.

### 3. URL Structure & Canonicalization
- Human-readable, lower-case, hyphen-separated URLs (e.g., `/bikes/yamaha-fzs-v3-2021`).
- Filtering and sorting parameters (e.g., `?brand=yamaha&sort=price_asc`) must set their canonical URL to the primary category page to prevent duplicate content indexing.
- Sold bike pages (`/bikes/[id]`) remain accessible with a clear `SOLD` status badge and canonical link, retaining historical search equity while offering recommendations for similar available bikes.

### 4. Structured Data (Schema.org / JSON-LD)
- Planned for implementation in Phase 8 (Public Showroom) using validated database entities:
  - `Motorcycle` / `Product` schema for bike detail pages (brand, model, vehicleIdentificationNumber/registration, itemCondition: UsedCondition, price, priceCurrency: BDT, availability: InStock / SoldOut).
  - `LocalBusiness` / `AutomotiveBusiness` schema for contact page and footer (name, legalName, address, telephone, openingHours).
- **Prohibition:** No fake aggregate ratings, fake review stars, or fake offer schemas.

---

## Private & Administrative Pages

- Administrative pages (`/admin/*`) and API endpoints (`/api/*`) are strictly excluded from search indexing via:
  1. Route-level metadata (`robots: { index: false, follow: false, noarchive: true }`).
  2. HTTP Response Headers (`X-Robots-Tag: noindex, nofollow, noarchive`).
  3. Disallow rules in `robots.ts` when indexing is active.
- **Server Authorization Mandatory:** Server-side authentication and role-based authorization must enforce access control regardless of crawler directives.
