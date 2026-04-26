/*!
 * Board Game Places — Pagination Hide
 * Version: 1.0.0
 * Project: https://boardgameplaces.com
 * Repo: https://github.com/urbanchallenger/boardgameplaces-js
 * License: MIT
 *
 * Hides the native Webflow CMS pagination wrapper via CSS. Pagination must remain in the DOM for Finsweet List Load to walk the pages, but the user never sees it.
 */
(function(){var s=document.createElement('style');s.textContent='.w-pagination-wrapper{display:none !important}';(document.head||document.documentElement).appendChild(s)})();