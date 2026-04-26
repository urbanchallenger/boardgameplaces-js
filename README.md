# boardgameplaces-js

Frontend scripts for **[Board Game Places](https://boardgameplaces.com)** — the editorially curated map of board game cafés, bars with games, and game clubs in Germany (and soon DACH and beyond).

The site itself is built on Webflow + a Notion CMS bridge via Whalesync. These scripts power the interactive Leaflet map, the detail panel, and the Finsweet List Load integration that bypasses Webflow's 100-item Collection List cap.

## Why this repo exists

Until 2026-04-26, all of these scripts lived as inline Webflow site scripts. The 2000-character inline limit had us fighting minifiers and shipping cryptic one-liners. This repo hosts the readable, banner-commented sources, deployed via [jsDelivr](https://www.jsdelivr.com/) so we get a global CDN, versioned URLs, and editable code.

## Live URLs (jsDelivr)

Once the repo is public on GitHub, jsDelivr serves any path under it without setup:

```
https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@main/scripts/<file>.js
```

For production, **always pin to a tag** instead of `@main` — otherwise jsDelivr's 12h cache and your published Webflow site can drift apart:

```
https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/<file>.js
```

## Scripts

Loaded on the home page in this exact order. Order matters — `intercept.js` must run before Leaflet, and `v13-hook.js` must run after `v12-helpers.js` so it can read `window.BGP_LBL`.

| # | File | Version | Purpose |
|---|------|---------|---------|
| 1 | `scripts/intercept.js` | 1.1.0 | Patches `L.map()` so the Leaflet map is exposed as `window.bgpMap`. Must run before Leaflet loads. |
| 2 | `scripts/pagination-hide.js` | 1.0.0 | Hides the native Webflow pagination via CSS (Finsweet still walks it in the DOM). |
| 3 | `scripts/v11-fix.js` | 1.11.2 | Loads Leaflet, builds the map, places initial markers, wires the submit form. |
| 4 | `scripts/v12-helpers.js` | 1.12.1 | Exposes `window.BGP_LBL` (label maps for type, gameLevel, foodLevel, pricing, etc.). |
| 5 | `scripts/v12-render.js` | 1.12.2 | Hides empty detail-panel sections, filters example.com / Deutschland defaults. |
| 6 | `scripts/v13-hook.js` | 1.13.3 | Adds markers + click-handlers for cards loaded by Finsweet beyond the first 100. |
| 7 | `scripts/sponsors.js` | 1.0.0 | Renders the sponsors block on the home map and on content pages. |

In addition, [Finsweet Attributes v2](https://finsweet.com/attributes/) is loaded directly from their CDN — that one we don't host ourselves.

## Webflow integration

In Webflow Site Settings → Custom Code → Head, add the script tags pointing at jsDelivr URLs (see `docs/ARCHITECTURE.md` for the full snippet). The previously registered inline scripts under the same names can stay registered as a fallback, but should not be applied to the page once external loading is verified.

## Development

These are vanilla JS files. No build step. Edit, commit, push, tag, and Webflow picks up the new version on the next page load (after jsDelivr cache expires — bust by bumping the tag).

```bash
git add scripts/v13-hook.js
git commit -m "v13-hook: handle non-numeric data-game-level"
git tag v1.0.1
git push --tags
```

Then update the version pin in Webflow's `<script>` tags from `@v1.0.0` to `@v1.0.1`.

## License

MIT. See `LICENSE`.
