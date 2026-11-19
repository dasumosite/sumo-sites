# SumoSites

The SumoSites website, customer enquiry form and six interactive demos.
All website source files, self-hosted fonts and images are in `dist/`.

## Deploy

Install dependencies with `npm ci`, then run `npm run deploy`.
The Cloudflare build connection deploys updates to `main` automatically.
Use a feature branch and merge into `main` when changes are ready.

The website uses static HTML, CSS and JavaScript. The enquiry form prepares
a draft in the visitor’s email app. Demo form answers and inventory changes
are held in browser memory.
