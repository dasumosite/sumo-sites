# SumoSites

The SumoSites website, customer enquiry form and six interactive demos.
Static pages, self-hosted fonts and images are in `dist/`. The enquiry email endpoint is a Cloudflare Pages Function in `functions/`.

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

The site has no build command. Cloudflare Pages bundles the email function
when deploying. Demo form answers and inventory changes are held in browser
memory.

## Website brief email

The website brief posts to `/api/website-brief`. The function asks Brevo to send
from and to `dasumo.site@gmail.com`. Reply-To is the visitor’s email address.
Verify the sending address in Brevo. Brevo may rewrite the From address for
senders on unauthenticated domains, including Gmail.

Copy `.env.example` to `.env` at the project root for local development and
fill in `BREVO_API_KEY`. Run `npx wrangler pages dev dist` to test the form and
its email endpoint locally.

For production, set `BREVO_API_KEY` as a secret under **Workers & Pages →
sumo-sites → Settings → Variables and Secrets**. To
upload the filled local file directly from an authenticated Wrangler session,
run `npx wrangler pages secret bulk .env --project-name sumo-sites`.
Deploy after setting the production secret. Keep the filled `.env` out of
Git and the static output directory.
