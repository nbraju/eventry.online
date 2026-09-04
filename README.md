# Eventry Aggregator PWA

Production repository for **https://eventry.online**.

## Repository structure

```text
Eventry-Aggregator/
├── index.html
├── manifest.json
├── sw.js
├── offline.html
├── icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── assets/
│   └── logo.svg
├── CNAME
└── README.md
```

## Architecture

- **eventry.online** — customer-facing event infrastructure marketplace.
- **eventry.site** — EventDesk vendor management PWA.
- Google Apps Script — shared aggregator API.
- Vendor-specific Apps Script deployments — private inventory, booking and payment operations.

## GitHub Pages deployment

1. Create a public repository named `Eventry-Aggregator`.
2. Upload all files preserving this folder structure.
3. Push to the `main` branch.
4. GitHub → Settings → Pages.
5. Deploy from `main` branch and `/ (root)`.
6. Add custom domain `eventry.online`.
7. Configure your DNS provider with GitHub Pages records.
8. Wait for HTTPS provisioning.

## Before production launch

- Confirm the Apps Script URL in `index.html`.
- Test vendor onboarding.
- Test vendor approval and public listing visibility.
- Test enquiries.
- Test EventDesk generated links.
- Test mobile installation.
- Test service-worker updates after deployment.

## PWA cache updates

When releasing a major update, change:

```js
const VERSION = 'eventry-v1.0.0';
```

in `sw.js`, for example to `eventry-v1.0.1`. This forces stale application caches to be replaced.

## Important

The service worker intentionally avoids caching Google Apps Script API responses, reducing the risk of serving stale vendor or enquiry data.
