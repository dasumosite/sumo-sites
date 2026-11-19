# SumoSites

The SumoSites website, customer enquiry form and six interactive demos.
All website source files, self-hosted fonts and images are in `dist/`.

## Production deployment

Live website: https://sumo-sites.pages.dev

Cloudflare Pages is connected to `dasumosite/sumo-sites` and automatically
deploys every push or merge to `main`. Use a feature branch and merge into
`main` when changes are ready. Preview branch deployments are disabled.

Cloudflare Pages settings:

- Production branch: `main`
- Root directory: `/`
- Build command: leave empty
- Build output directory: `dist`

The website needs no build step, runtime server or third-party dependencies.
To preview locally, run `python3 -m http.server 8000 --directory dist` and
open http://localhost:8000.

The website uses static HTML, CSS and JavaScript. The enquiry form prepares
a draft in the visitor’s email app. Demo form answers and inventory changes
are held in browser memory.
