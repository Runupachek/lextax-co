# lextax.co

Lexurious Taxes — Less Taxes, More Returns. Marketing + client intake site for Alexis Bryant, Atlanta / Marietta.

Deployed on Railway from this repo.

## Self-contained pages (2026-11-17)

Boss found buttons dead and layout warped on a slow connection: when
`/assets/style.css` stalls the page renders unstyled, and when
`/assets/lead-pipeline.js` or `/assets/tools.js` stalls every button does
nothing. Fix: every page inlines its critical CSS and JS, so layout and
buttons work even with zero asset loads. The files in `/assets/` remain the
source of truth.

- After editing `assets/style.css`, `assets/tools.js`, or
  `assets/lead-pipeline.js`, re-run `node inline-assets.js` to refresh the
  inlined copies, then verify with `node check-inline.js`.
- `node check-inline.js` exits nonzero if any inlined copy has drifted from
  its source. Run it before every deploy.
- Images get one automatic retry with a cache-buster if a download stalls.

## Tests

- `node --test server.seo.test.js` — serves the site on a scratch port and
  asserts first-byte SEO facts per route, the sitemap, robots, the branded
  404, and that source files 404.

## Brand rules (Boss)

- No "gig worker" language anywhere on the site. The audience is
  entrepreneurs and business people. The tool is the **Business Deduction
  Finder** (`/tools/business-deduction-finder`; the old
  `/tools/gig-deduction-finder` URL 301-redirects to it).
- No mention of iMineWise / iminewise.com on this site — Alexis's lane only.
