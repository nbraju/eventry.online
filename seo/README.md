# eventry-seo

Static SEO landing-page generator for Eventry. It reads your vendor data and writes plain HTML pages like
`/hyderabad/wedding-photographers/`, plus `sitemap.xml` and `robots.txt`.
It never edits the PWA: no `index.html`, `sw.js`, manifest, or JS of the app is read or changed.

## What it writes

| Output | Notes |
|---|---|
| `/<city>/<category>/index.html` | Unique copy, vendor list, FAQ, JSON-LD (CollectionPage, BreadcrumbList, ItemList, FAQPage) |
| `/<city>/index.html` | City hub linking to that city's category pages |
| `/locations/index.html` | One page linking to all city hubs (a crawlable entry point) |
| `/sitemap.xml` | Only indexable pages, `lastmod` changes only when a page's content changes |
| `/robots.txt` | Allows all crawlers, optional explicit AI-crawler rules, Sitemap line |

**Safety rules built in**
- A file is overwritten only if it contains the `eventry-seo-generated` marker. Anything else (an existing `robots.txt`, a folder you already use) is skipped and reported; for `robots.txt` / `sitemap.xml` a proposal is saved to `reports/`.
- `protectedFiles` and `reservedPaths` in `config/site.json` can never be written.
- Fake sample data can only build into `./out` (preview), never into the live repo.
- Build aborts if the vendor feed returns 0 rows, an HTML error page, or the count drops by more than half (the "0 vendors" failure mode).

## Quick start

```bash
npm run preview          # builds fake sample data into ./out and validates it
open out/hyderabad/wedding-caterers/index.html
```

Go live:
1. Copy this folder into the Pages repo as `seo/` (or keep it in a separate repo and copy output yourself).
2. Add repo secret `EVENTRY_API_URL`: the full Apps Script web-app URL that returns the vendor list as JSON.
3. Copy `.github/workflows/seo-pages.yml` into the repo's `.github/workflows/`.
4. Run the workflow manually once, read `seo/reports` in the log output, then submit `https://eventry.online/sitemap.xml` in Google Search Console.

Local live build: `EVENTRY_API_URL=... npm run fetch && npm run build:live`.

## Vendor data

Columns are matched by alias, case and punctuation ignored (see `src/lib/normalize.js`):
`uid`, `name`, `category`, `subcategory`, `city`, `area`, `services` (comma separated), `description`, `phone`/`whatsapp`, `status`, `created`.
Only rows whose `status` is approved/active/live/verified/published are used. Duplicate UIDs and duplicate phone numbers are dropped.
Photographers are matched on category, subcategory, services or description (e.g. category "Others", subcategory "Photography"). Tune matching in `config/categories.json` under `match`.

## Thin pages and indexing

`minVendorsToIndex` (default 3) decides which pages are indexable. Pages in `config/pages.json -> required` are always built;
if they have fewer vendors they are built as `noindex,follow` and left out of the sitemap, and they show a "list your business" empty state.
Other city/category combos are built automatically once they reach the threshold.
Set `thinPagePolicy` to `skip` to not build thin pages at all. Lowering the threshold to 1 is possible but risks doorway-page treatment.

## Adding a city or category

- City: add an entry to `config/cities.json` (`name`, `state`, `aliases`, `nearby`, `localities`, `intro`, `tips`). Vendors in the sheet whose city matches the name or an alias are picked up.
- Category: add an entry to `config/categories.json` (`match`, `intro`, 8 `tips`, 3 `faq` items) and, if wanted, a city tip under the same `group`.
- Review the local text in `cities.json` before launch and add real local detail (venue types, peak months, local customs). That is what separates these pages from templates.

## Before launch

- **Service worker:** if `sw.js` falls back to the app shell for navigations, returning visitors may get the PWA instead of these pages. Exclude these paths from the fallback.
- **Discovery:** nothing in the PWA links to these pages (by design). The sitemap covers crawling; one footer link to `/locations/` would help ranking when you are ready.
- **Contact data:** WhatsApp links use vendor numbers from the feed. Set `privacy.showWhatsAppLink` to `false` if vendors have not agreed to public contact. JSON-LD omits phone numbers by default.
- **Data privacy:** `data/vendors.json` contains phone numbers and is git-ignored. If the generator lives inside the Pages repo, `seo/config` and `seo/src` become public.
- **No fabricated data:** pages contain no ratings, reviews or prices, and the validator fails the build if JSON-LD contains them.
- `config/site.json`: set `ogImage` and `vendorLinkTemplate` once you have a share image and per-vendor deep links in the app.
