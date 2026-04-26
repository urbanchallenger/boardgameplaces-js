/*!
 * Board Game Places — Leaflet Map Intercept
 * Version: 1.1.0
 * Project: https://boardgameplaces.com
 * Repo: https://github.com/urbanchallenger/boardgameplaces-js
 * License: MIT
 *
 * Patches L.map() via Object.defineProperty so the Leaflet map instance for #map is exposed as window.bgpMap (and #listicle-map as window.bgpListicleMap). MUST load BEFORE Leaflet itself, so this script runs before v11-fix and before any other Leaflet-using code.
 */
(function(){if(window.__bgpIntercepted)return;window.__bgpIntercepted=true;var _L;function patch(L){if(!L||L.__bgpPatched)return;L.__bgpPatched=true;var orig=L.map;L.map=function(){var m=orig.apply(this,arguments);try{var id=arguments[0];if(id==='map')window.bgpMap=m;else if(id==='listicle-map')window.bgpListicleMap=m}catch(e){}return m}}if(window.L){_L=window.L;patch(_L)}else{try{Object.defineProperty(window,'L',{configurable:true,get:function(){return _L},set:function(v){_L=v;patch(v)}})}catch(e){var t=setInterval(function(){if(window.L){clearInterval(t);patch(window.L)}},20);setTimeout(function(){clearInterval(t)},15000)}}})();