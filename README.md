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

The website brief posts to `/api/website-brief`. The function sends the answers
through Brevo to `dasumo.site@gmail.com` and sets Reply-To to the visitor’s
address.

Copy `.env.example` to `.env` at the project root for local development.
Fill in `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`. Use a sender configured in
Brevo. Run `npx wrangler pages dev dist` to test the form and its email endpoint
locally.

For production, add the same values under **Workers & Pages → sumo-sites →
Settings → Variables and Secrets**. Store `BREVO_API_KEY` as a secret. To
upload the filled local file directly from an authenticated Wrangler session,
run `npx wrangler pages secret bulk .env --project-name sumo-sites`.
Deploy after setting the production values. Keep the filled `.env` out of
Git and the static output directory.
