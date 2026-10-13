# AGENTS.md

## Commands

```bash
npm install                        # dev dependencies only (wrangler, @playwright/test, @axe-core/playwright)
npx playwright install chromium    # once, before the first e2e run
npm start                          # wrangler dev on http://localhost:8770, with the production headers
npm test                           # unit tests (node:test): engine, offline file list, version, no inline scripts
npm run test:e2e                   # Playwright, desktop and mobile, against npm start; includes an axe scan and an offline run
npm run deploy                     # unit tests, then wrangler deploy
node scripts/check_refs.js         # needs network: every citation resolves to the intended paper
python scripts/build_growth_data.py  # regenerate public/js/data/growth-refs.js from data-src/
```

Workers Builds (Worker settings, Builds), to be connected once the GitHub repository exists:
production branch `main`, empty build command, deploy command `npm run deploy`; other branches run
`npm test`. Playwright is not part of the deploy gate: the Workers Builds image cannot start Chromium
(no root, no system libraries). Run `npm run test:e2e` locally before pushing UI changes. Run
`check_refs.js` after changing `refs.js`; it is not in `npm test` because it depends on Crossref and
NCBI being reachable.

`allowScripts` in `package.json` pins the `esbuild` and `workerd` versions whose install scripts npm
may run. Update it when a Wrangler upgrade changes those versions.

## Versions

- `APP_VERSION` in `public/js/ui/app.js` is the version shown in the footer.
- `CACHE` in `public/sw.js` names the service worker cache and carries the same number
  (`weightframe-v1.00`). Changing it makes installed copies drop the old cache.
- Bump both together on a user-visible release and whenever `SHELL` or the caching rules change.
  `npm test` fails if they differ.

## Architecture

A static site on a Cloudflare Worker with static assets only (`wrangler.jsonc`, custom domain
`weightframe.tinkered.app`, `workers.dev` and preview URLs off, Worker request logs off). No build step, no
runtime dependencies, no server code. `public/` is the only folder deployed. Python is used only for
the growth-table conversion script.

It is a private, non-commercial hobby project that collects no visitor data on its own side: inputs
stay in the browser. Cloudflare still sees visitor IPs as the host, the tinkered.app dashboard shows a
sample of them (up to 7 days), and the footer email link brings in mail. So the app has a short data note,
`privacy.html` (GDPR Art. 13), but no terms, provider details or consent banner. Analytics, a Worker script, a
backend storing user data or any third-party request would need a new legal check first. The
service worker (`public/sw.js`) runs in the browser and only caches the app's own files; it is not a
Worker script. The footer credit "WeightFrame vX.XX by Kuba · tinkered.app · Privacy" sits at the foot of the
input rail, under the form, rather than at the bottom of the page (the owner's choice). It links Kuba to
`mailto:kuba@tinkered.app`, tinkered.app to `https://tinkered.app`, and Privacy to `privacy.html`
(served as `/privacy`, kept out of search results by `X-Robots-Tag` in `_headers` and a robots meta
tag). Update `privacy.html` when the app stores something new in the browser or the hosting or mail
setup changes. The tinkered.app logo is inlined in `public/index.html`, so nothing loads from another origin.

## Layout

```
public/                   everything that is deployed
  index.html              page shell
  privacy.html            data and privacy note (EN/PL), linked from the footer, noindex
  _headers                security headers (Cloudflare config, not served)
  sw.js                   service worker: offline copy of every file in SHELL
  css/styles.css          design tokens (light/dark), layout, components
  assets/                 logo and bundled fonts (with their OFL licences)
  js/core/                calculation engine (no DOM; also runs in Node)
    refs.js               citation registry
    i18n-text.js          English and Polish text for engine-generated sentences
    stats.js              normal distribution, LMS
    anthro.js             BMI classes, central fat, body-fat estimators
    growth.js             CDC / WHO BMI-for-age
    energy.js             BMR equations, equation choice, NASEM 2023 TDEE
    hall.js               Hall 2011 dynamic body-weight model
    assess.js             combines everything into one result
  js/data/growth-refs.js  generated LMS tables
  js/ui/                  dashboard rendering, charts, methods section, app state, Polish dictionary;
                          theme-init.js loads in <head> so a saved theme applies before first paint
data-src/                 official CDC / WHO downloads (unchanged)
scripts/                  data conversion and reference checking
tests/                    unit tests (node:test)
e2e/                      Playwright tests
```

## Conventions

- `public/js/core/` (the calculation engine) must stay DOM-free and runnable under `node --test`. UI rendering lives in `public/js/ui/`.
- Every new metric or formula needs a verified, linked source added to `public/js/core/refs.js`; see [RESEARCH.md](RESEARCH.md) for the evidence behind existing formulas and which one wins in which scenario.
- i18n is an English-keyed substring dictionary in `public/js/ui/i18n.js` applied to rendered HTML. Any English string added or changed in `board.js`, `methods.js`, or `index.html` needs an identical entry added to the dictionary. Citations and `.formula` blocks are shielded from translation, and class names must never contain dictionary keys.
- Children (2–17): percentiles and guideline-based goals only, never calorie-deficit plans.
- PWA: every file in `public/` except `sw.js`, `_headers`, the licence texts and the social card must be in `SHELL` in `public/sw.js`; `tests/pwa.test.js` checks this. Pages are listed by the URL the host serves (`./`, `privacy`), never the `.html` form: the host redirects that form, and a cached redirect cannot open a page offline. The fetch handler maps an offline `.html` visit to the clean URL. Files are network-first with the cache as the offline fallback.
- Link preview: the `og:*` tags in `public/index.html` point to `public/icons/social-card.png` (1200×630), static English with absolute URLs because crawlers do not run scripts.
- Page structure: the masthead holds the `h1` and a navigation of three buttons (`aria-current="page"` marks the open one). They are not an ARIA tablist, because the Dashboard button also opens its section links and a tablist may hold nothing but tabs. Each section is its own `<main>`, with the two closed ones `hidden`. Dashboard headings run `h2` (section), `h3` (card or column title), `h4`.
- Colour: `--blue-ink` is the blue for text on `--blue-soft`; plain `--blue` on that tint is below 4.5:1 in the light theme.
- Security headers: `public/_headers` sets a strict CSP (`script-src 'self'`): no inline scripts, no external origins. Inline styles are allowed (charts position elements with `style`).
