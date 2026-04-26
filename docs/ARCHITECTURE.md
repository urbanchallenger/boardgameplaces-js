# Architecture

## How the home page boots

```
HTML parse
  ├─ <script src=".../intercept.js">          ← patches L.map BEFORE leaflet loads
  ├─ <script src=".../finsweet@2/attributes.js" fs-list>  ← Finsweet List Load
  ├─ <script src=".../pagination-hide.js">    ← injects CSS to hide pagination
  ├─ <script src=".../v11-fix.js">            ← loads Leaflet, then iMain():
  │                                              - L.map('map')  ← intercepted, sets window.bgpMap
  │                                              - reads first 100 location-cards
  │                                              - places markers
  │                                              - wires detail panel + submit form
  ├─ <script src=".../v12-helpers.js">        ← sets window.BGP_LBL
  ├─ <script src=".../v12-render.js">         ← section-hide logic
  ├─ <script src=".../v13-hook.js">           ← waits for window.bgpMap
  │                                              - listens to fs-list-success
  │                                              - listens to MutationObserver on .w-dyn-items
  │                                              - adds markers for cards beyond first 100
  └─ <script src=".../sponsors.js">
```

## The Finsweet bypass

Webflow CMS Collection Lists render at most **100 items per page**. We have ~234 today and expect ~500 at launch. [Finsweet List Load](https://finsweet.com/attributes/list-load) with `fs-list-load="all"` solves this by:

1. Webflow renders the first 100 items normally + native pagination (which we hide via CSS).
2. Finsweet's script reads the page-count from the pagination, parallel-fetches each subsequent page of HTML in the background, and merges the items into the existing `.w-dyn-items` container.
3. Result: all items end up in the DOM as if they were rendered server-side, just with a 1–2 second delay for the additional batches.

Required Webflow Designer settings on the Locations Collection List:
- **Paginate Items**: ✅ enabled, 100 per page
- **Show Page Count**: ✅ enabled (boosts Finsweet's parallel fetch)

Required attributes:
- `fs-list-element="list"` on `.w-dyn-items`
- `fs-list-load="all"` on `.w-dyn-items`

## Why `intercept.js` is necessary

V11 fix creates the Leaflet map inside a closure: `var MAP = L.map('map'); M = MAP;` — neither `MAP` nor `M` is on `window`, so V13 can't reach it. We could fix this by editing V11, but V11 is large, stable, and ships the submit-form too — a risky place to edit. So instead we monkey-patch `L.map()` _before_ V11 calls it:

```js
// in intercept.js, simplified:
Object.defineProperty(window, 'L', {
  set(v) { _L = v; v.map = wrappedMapFactory; },
  get() { return _L; }
});
```

The `defineProperty` setter fires the moment `leaflet.js` assigns `window.L = ...`. We patch `L.map` synchronously before any other code can call it. When V11's `iMain()` then calls `L.map('map')`, our wrapper captures the result on `window.bgpMap`.

## Why V13 watches both `fs-list-success` and a MutationObserver

Finsweet does emit a `fs-list-success` event when its load completes, but:
- The event name has changed across major versions in the past.
- During development, it's helpful if the hook works regardless of whether Finsweet succeeds, fails partially, or is replaced later.

So we belt-and-braces: a MutationObserver on `.w-dyn-items` catches any DOM addition, and a series of `setTimeout` retries (2s, 5s, 9s) covers slow networks.

## The submission flow

`v11-fix.js` opens the modal, validates the form, and POSTs to a Make.com webhook (`https://hook.eu1.make.com/pae8n9il0udntjonqp4d9gg6b3n7inqi`). Make then routes to email + Notion. Editing the form schema means editing v11-fix.js — keep an eye on the validation block.

## Versioning

Each script carries a SemVer in its banner header. The repo version (in git tags) bumps when **any** script changes. Webflow's `<script>` tags should use `@vX.Y.Z` pins, never `@main`, so that production never picks up an in-progress edit.

Old script versions are still hosted by Git history and accessible via tag-pinned jsDelivr URLs, so reverting is a single commit + tag bump.
