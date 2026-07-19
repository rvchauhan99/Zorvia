# MealHQ SEO runbook (Canada-first)

**Canonical host:** `https://www.mealhq.ca`  
**Apex redirect:** `mealhq.ca` → `www.mealhq.ca` via [`frontend/vercel.json`](../frontend/vercel.json)

## What shipped in the codebase

| Item | Location |
|------|----------|
| `metadataBase`, OG/Twitter, `en-CA` | [`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx) |
| `robots.ts` / `sitemap.ts` | `frontend/src/app/` |
| Noindex app + auth shells | `(provider)`, `(consumer)`, `(auth)` layouts |
| JSON-LD Organization + SoftwareApplication | Landing + `/about` |
| Marketing pages | `/pricing`, `/faq`, `/for-tiffin-providers`, `/tiffin-software-canada` |
| City hubs | `/cities/{toronto,mississauga,vancouver,calgary,edmonton,ottawa}` |
| Blog | `/blog` + 8 guides in [`seo-blog.ts`](../frontend/src/lib/seo-blog.ts) |
| GA4 loader | `NEXT_PUBLIC_GA_MEASUREMENT_ID` + [`GoogleAnalytics.tsx`](../frontend/src/components/GoogleAnalytics.tsx) |
| Conversion events | `signup_start`, `signup_complete`, `consumer_signup`, `contact_submit` via [`ga.ts`](../frontend/src/lib/ga.ts) |

Sitemap: `https://www.mealhq.ca/sitemap.xml`  
Robots: `https://www.mealhq.ca/robots.txt`

## Phase 0 — Ops checklist (do in Google / Bing / Vercel)

1. **Google Search Console**
   - Prefer a **Domain** property for `mealhq.ca` (covers www + apex).
   - Verify via DNS TXT.
   - Submit sitemap: `https://www.mealhq.ca/sitemap.xml`.
2. **Google Analytics 4**
   - Create a GA4 property (Canada / CAD).
   - Set Vercel env `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX`.
   - Mark `signup_complete` and `consumer_signup` as key events.
   - Link GA4 ↔ Search Console.
3. **Bing Webmaster Tools** — import from GSC or verify DNS; submit same sitemap.
4. **Vercel**
   - Attach `www.mealhq.ca` as primary production domain.
   - Confirm apex redirect (vercel.json) is active after deploy.
   - Protect Preview deployments (Password or Vercel Authentication) so `*.vercel.app` is not indexed.
5. **Baseline**
   - PageSpeed Insights on `/`.
   - Search “mealhq” after indexing; confirm `/provider` does not appear.

## Content ops (monthly)

- Publish or refresh 1–2 blog posts (edit [`seo-blog.ts`](../frontend/src/lib/seo-blog.ts) + sitemap entries).
- Expand cities only with unique copy (see [`seo-cities.ts`](../frontend/src/lib/seo-cities.ts)).
- Internal-link new pages from landing footer and `/tiffin-software-canada`.

## French (later)

After EN rankings stabilize for GTA/Vancouver, add `/fr` mirrors for pricing + for-providers with `hreflang` `en-CA` / `fr-CA`. Do not auto-translate thin pages.

## Do not

- Index `/provider`, `/consumer`, or auth flows.
- Mass-generate city doorway pages.
- Buy links or stuff keywords into the brand H1 (keep **MealHQ** as H1 on the homepage).

## Related docs

- Domains / OAuth: [`DEPLOY_CLOUD_RUN.md`](./DEPLOY_CLOUD_RUN.md)
- Product: [`FUNCTIONAL.md`](./FUNCTIONAL.md)
- Facebook + Instagram (Canada B2B reach): [`SOCIAL_MEDIA_SETUP.md`](./SOCIAL_MEDIA_SETUP.md)
