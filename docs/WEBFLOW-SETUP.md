# Webflow Setup — switching from inline to jsDelivr

Quick guide for moving Board Game Places from inline-registered Webflow scripts to externally hosted ones via jsDelivr.

## 1. Push this repo to GitHub

Make sure the repo is **public** — jsDelivr only serves public GitHub repos out of the box.

```bash
git init
git add .
git commit -m "Initial: extract scripts from inline Webflow registrations"
git remote add origin https://github.com/urbanchallenger/boardgameplaces-js.git
git branch -M main
git push -u origin main
git tag v1.0.0
git push --tags
```

## 2. Verify jsDelivr works

Visit one of these URLs — should return the script source, not a 404:

- https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/intercept.js
- https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/v13-hook.js

First load may take 5–30 seconds while jsDelivr fetches and caches.

## 3. Add to Webflow

In Webflow Designer → Site Settings → Custom Code → Inside `<head>` tag, paste:

```html
<!-- Board Game Places — frontend scripts (https://github.com/urbanchallenger/boardgameplaces-js) -->
<script src="https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/intercept.js"></script>
<script async type="module"
  src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js"
  fs-list></script>
<script src="https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/pagination-hide.js"></script>
<script src="https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/v11-fix.js"></script>
<script src="https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/v12-helpers.js"></script>
<script src="https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/v12-render.js"></script>
<script src="https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/v13-hook.js"></script>
<script src="https://cdn.jsdelivr.net/gh/urbanchallenger/boardgameplaces-js@v1.0.0/scripts/sponsors.js"></script>
```

**Note:** Site-wide custom code applies to every page. Some scripts (v11-fix, v13-hook, sponsors) are home-page-specific. Either:
- Put only `intercept.js` and `finsweet attributes` in site-wide head, and the rest in **Page Settings → Custom Code (Head)** of the Home page only, OR
- Keep them site-wide — most non-map pages won't have `#map`, so the scripts no-op cheaply.

## 4. Remove the inline registrations

Once the jsDelivr-hosted scripts are verified live, you have two options:

**Option A (cautious):** Leave the inline scripts registered but un-applied. Easy rollback, slight registry clutter.

**Option B (clean):** Delete the inline registrations via the Webflow API. This requires running a delete-all-site-scripts call.

I'd recommend Option A for the first 1–2 weeks.

## 5. Updating later

When you change a script:

```bash
# edit scripts/v13-hook.js
git add scripts/v13-hook.js
git commit -m "v13-hook: <change>"
# bump SemVer in the banner of the changed file too
git tag v1.0.1
git push && git push --tags
```

Then update **only the version pin** in the Webflow `<script>` tags from `@v1.0.0` → `@v1.0.1` and republish.

If you need to force-bust jsDelivr's cache before the tag propagates (rare, ~12h normally), use the purge endpoint: https://www.jsdelivr.com/tools/purge

## 6. Migrating to a custom domain later

When you want `cdn.boardgameplaces.com` instead of `cdn.jsdelivr.net/gh/...`:

1. Set up Cloudflare Pages connected to this repo (auto-deploys on push).
2. Add `cdn.boardgameplaces.com` as a custom domain in Cloudflare Pages.
3. In Webflow, swap all jsDelivr URLs for `https://cdn.boardgameplaces.com/scripts/<file>.js`.

That's it — jsDelivr stops being involved.
