/*!
 * Board Game Places — V15 Single Layer Map
 * Version: 1.15.6
 * Project: https://boardgameplaces.com
 * Repo: https://github.com/urbanchallenger/boardgameplaces-js
 * License: MIT
 *
 * Replaces V11 (map+marker init), V12-helpers (BGP_LBL), V12-render (detail-panel),
 * V13-hook (Finsweet marker patching), V14-takeover (V11 race workarounds).
 *
 * One module owns: Leaflet init, marker lifecycle, all filter logic, detail panel,
 * results counter. The DOM is the single source of truth for location data —
 * Webflow renders cards from CMS, Finsweet List Load fills past the 100-cap, and
 * V15 reads them all out and projects them onto the map.
 *
 * Sidebar list rendering remains Webflow's job (cards are bound to the CMS via
 * the Designer); V15 only toggles the .hidden class on cards during filter passes.
 *
 * v1.15.1: V11 used to load Leaflet for us. With V11 removed, V15 now loads
 *          Leaflet (CSS+JS) itself before initialising the map.
 * v1.15.2: Read ALL CMS-bound fields from .bgp-data slots. The card wrapper's
 *          data-* attributes are Designer placeholder defaults, NOT real data.
 *          Only data-lat, data-lng, data-location-id are CMS-bound at the wrapper.
 * v1.15.3: V11 used to inject CSS for marker pins (.bm/.bc/.bb/.bk) and the
 *          .detail-panel.open visibility state. V15 now injects those styles
 *          itself via a <style> tag. Card and detail-panel container styling
 *          remains owned by Webflow Designer.
 * v1.15.4: Carry V11's full ~3KB CSS verbatim (type-tag colour tokens, range slider,
 *          pricing-chip active, location-card hover/active, mobile responsive layout
 *          switch, listicle marker variants). ALSO: V11 dynamically added .tc/.tb/.tk
 *          classes to .type-tag elements per card type — V15 now does the same, and
 *          replaces the English type label ("club") with the German one ("Spieleclub").
 *          Same applies to #detail-type in the detail panel.
 * v1.15.5: Detail panel selectors fixed. Webflow uses element IDs (#detail-desc,
 *          #detail-game, #detail-address, #detail-hours, #detail-pricing, #detail-web,
 *          #detail-name, #detail-meta, #detail-city, #detail-pillen) — not the class
 *          names V15 was guessing. Sections share the single class .detail-section;
 *          V15 now resolves each section via its data-field id and walks up to the
 *          .detail-section ancestor to show/hide based on whether a value exists.
 *          Designer placeholder text is always overwritten.
 * v1.15.6: Pill (.detail-pill) styling added — V14 created pill spans dynamically
 *          but their visual styling came from the Webflow Designer, which lost the
 *          rules during the migration. V15 now ships pill base style (dashed border,
 *          paper background, condensed padding) plus solid-border variants for
 *          .detail-pill-lang and .detail-pill-access.
 */
(function(){'use strict';

// ---- Inject CSS for V15-owned elements ----
// V11 injected ~3.2KB of CSS inline. V15 carries that forward verbatim because it's been
// thoroughly tested. Covers: marker pins (.bm/.bc/.bb/.bk), card type-tag color tokens
// (.type-tag.tc/.tb/.tk), sidebar marker variant (.sm/.sc/.sb/.sk for listicle pages),
// range slider styling, pricing-chip active state, location-card hover/active, mobile
// responsive switching, and the .open visibility states for detail panel + filter panel.
function injectStyles(){
  if(document.getElementById('bgp-v15-styles'))return;
  var css=''
// Marker pins (drop shape with rotated content)
+'.bm{width:28px;height:28px;border:2px solid #2a2622;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 #2a2622}'
+'.bm>span{transform:rotate(45deg);font-size:13px;font-weight:700;color:#2a2622}'
+'.bc{background:#d4a63a}'
+'.bb{background:#3a6b3a}'
+'.bb>span,.bk>span{color:#fff}'
+'.bk{background:#c8471e}'
// Hidden utility
+'.hidden{display:none!important}'
+'.location-card.hidden{display:none!important}'
// Type-tag colour tokens (applied dynamically by V15 to .type-tag elements inside cards)
+'.type-tag.tc{background:#d4a63a!important;color:#1a1816!important;border-color:#2a2622!important}'
+'.type-tag.tb{background:#3a6b3a!important;color:#fff!important;border-color:#3a6b3a!important}'
+'.type-tag.tk{background:#c8471e!important;color:#fff!important;border-color:#c8471e!important}'
// Detail-panel header type-tag (id selector keeps Webflow Designer style as fallback)
+'#detail-type.tc{background:#d4a63a}'
+'#detail-type.tb{background:#3a6b3a;color:#fff;border-color:#3a6b3a}'
+'#detail-type.tk{background:#c8471e;color:#fff;border-color:#c8471e}'
// Sidebar/listicle marker variant (.sm = small marker, used on listicle pages)
+'.sm{width:32px;height:32px;border:2px solid #2a2622;background:#fffdf7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Fraunces",serif;font-weight:700;font-size:15px;color:#2a2622;box-shadow:2px 2px 0 #2a2622}'
+'.sm.sc{background:#d4a63a}'
+'.sm.sb{background:#3a6b3a;color:#fff}'
+'.sm.sk{background:#c8471e;color:#fff}'
// Listicle spot card highlight
+'.spot-card.highlight{transform:translate(-2px,-2px);box-shadow:8px 8px 0 #c8471e;transition:transform .2s,box-shadow .2s}'
// Range slider
+'input.range-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;background:#f5f1e8;border:1.5px solid #2a2622;outline:none;cursor:pointer;padding:0;margin:0;display:block}'
+'input.range-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;background:#c8471e;border:2px solid #2a2622;border-radius:50%;cursor:pointer;box-shadow:1.5px 1.5px 0 #2a2622}'
+'input.range-slider::-moz-range-thumb{width:20px;height:20px;background:#c8471e;border:2px solid #2a2622;border-radius:50%;cursor:pointer;box-shadow:1.5px 1.5px 0 #2a2622;box-sizing:border-box}'
// Pricing chip active state
+'.pricing-chip.active{background:#1a1816!important;color:#fffdf7!important;border-color:#1a1816!important}'
// Detail-panel pills (frequency, setting, language, accessibility tags)
+'.detail-pill{display:inline-flex;align-items:center;padding:3px 9px;border:1.5px dashed #2a2622;background:#fffdf7;font-size:12px;line-height:1.4;color:#1a1816;font-weight:500;letter-spacing:0.01em;white-space:nowrap}'
+'.detail-pill.detail-pill-lang{background:#f5f1e8;border-style:solid;border-width:1px}'
+'.detail-pill.detail-pill-access{background:#f5f1e8;border-style:solid;border-width:1px}'
// Open states for filter panel and detail panel
+'.detail-filter-panel.open{display:block!important}'
+'.detail-panel.open{display:block!important}'
// Submit form (left in for forwards-compat; V15 does not implement the form yet)
+'#submit-form-backdrop.open{display:flex!important}'
+'.form-input-err{border-color:#c8471e!important;background:#fef0ea!important}'
+'.form-submitting{opacity:0.6;pointer-events:none}'
// Location card hover/active
+'.location-card{transition:transform .12s,box-shadow .12s}'
+'.location-card:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 #2a2622}'
+'.location-card.active{background:#e8a07a!important;transform:translate(-2px,-2px);box-shadow:4px 4px 0 #2a2622}'
// Mobile responsive layout switch (show-list / show-map body classes)
+'@media(max-width:991px){'
+  'body.show-list .sidebar{max-height:none!important;height:100vh!important;border-bottom-width:0!important}'
+  'body.show-list .map-wrap{display:none!important}'
+  'body.show-map .sidebar{max-height:none!important;height:auto!important;border-bottom-width:2px!important}'
+  'body.show-map .location-list,body.show-map .results-header,body.show-map #results-count,body.show-map .detail-filter-toggle,body.show-map .detail-filter-panel{display:none!important}'
+  '.page-title{font-size:40px!important;line-height:1.05!important}'
+  '.listicle-map{height:280px!important}'
+  '.spot-card{grid-template-columns:1fr!important;gap:6px!important;padding:20px!important}'
+  '.spot-number{font-size:34px!important}'
+  '.spot-name{font-size:20px!important}'
+  '.spot-header{flex-wrap:wrap}'
+'}';
  var s=document.createElement('style');
  s.id='bgp-v15-styles';
  s.textContent=css;
  document.head.appendChild(s);
}

// ---- Ensure Leaflet is available ----
// V11 used to load Leaflet for us; with V11 gone, V15 takes responsibility.
function loadLeafletIfNeeded(cb){
  if(window.L){cb();return}
  // CSS first (idempotent — checks for existing stylesheet)
  if(!document.querySelector('link[href*="leaflet"]')){
    var css=document.createElement('link');
    css.rel='stylesheet';
    css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    css.crossOrigin='';
    document.head.appendChild(css);
  }
  var s=document.createElement('script');
  s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  s.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  s.crossOrigin='';
  s.onload=function(){cb()};
  s.onerror=function(){console.error('[BGP V15] failed to load Leaflet')};
  document.head.appendChild(s);
}

function startV15(){
var L=window.L;if(!L){console.error('[BGP V15] Leaflet not loaded after wait');return}
injectStyles();

// ---- Label maps (carried forward from v12-helpers, with T added) ----
var LBL={
  T:{cafe:'Spielecafé',bar:'Bar mit Spielen',club:'Spieleclub'},
  F:{permanent:'Permanent',weekly:'Wöchentlich',biweekly:'Zweiwöchentlich',monthly:'Monatlich',irregular:'Unregelmäßig'},
  S:{commercial:'Kommerziell',community:'Community',library:'Bibliothek','religious':'Kirchengemeinde',senior:'Senioren',family:'Familien',shop:'Spieleladen',intercultural:'Interkulturell'},
  A:{wheelchair:'♿ Barrierefrei','kid-friendly':'👶 Familienfreundlich',quiet:'🔇 Ruhig','late-night':'🌙 Spät offen','reservation-needed':'📅 Reservierung'},
  L:{de:'🇩🇪 DE',en:'🇬🇧 EN',fr:'🇫🇷 FR',es:'🇪🇸 ES',it:'🇮🇹 IT',tr:'🇹🇷 TR'},
  G:{1:'Wenige (<20)',2:'Solide (20–100)',3:'Groß (100–500)',4:'Sehr groß (500+)'},
  FD:{1:'Nur Getränke',2:'Getränke & Snacks',3:'Mahlzeiten',4:'Vollständiges Restaurant'},
  P:{free:'Kein Eintritt',consumption:'Verzehrpflicht',hourly:'Stundentarif',flat:'Tagespauschale',membership:'Vereinsbeitrag'}
};
// Expose for any third-party code that may still expect window.BGP_LBL
window.BGP_LBL=LBL;

// ---- State ----
var state={
  map:null,
  markers:{},          // id -> {marker, card}
  initialFitDone:false,
  filter:{
    type:'all',
    pricing:new Set(),
    gameLevel:0,
    foodLevel:0,
    search:''
  }
};

// ---- DOM helpers ----
function slot(card,key){
  var el=card.querySelector('.bgp-data[data-key="'+key+'"]');
  return el?el.textContent.trim():'';
}
// Read a card field. ALL CMS-bound fields live in .bgp-data slots — the wrapper data-* attributes
// are Designer placeholder defaults (e.g. "Beispiel-Ort", "cafe"), NOT real CMS data.
// The only wrapper attributes that are actually CMS-bound: data-lat, data-lng, data-location-id.
function field(card,key){return slot(card,key)}

// ---- Marker icon ----
function makeIcon(type){
  var k=type==='cafe'?'bc':type==='bar'?'bb':type==='club'?'bk':'bk';
  var lbl=type==='cafe'?'S':type==='bar'?'B':'C';
  return L.divIcon({
    className:'',
    html:'<div class="bm '+k+'"><span>'+lbl+'</span></div>',
    iconSize:[28,28],iconAnchor:[14,28]
  });
}

// ---- Detail panel ----
function pill(container,cls,text){
  var s=document.createElement('span');
  s.className='detail-pill'+(cls?' '+cls:'');
  s.textContent=text;
  container.appendChild(s);
}
// Set text on an element with the given id, scoped under panel.
// Webflow may render Designer placeholder text — we always overwrite.
function setIdText(panel,id,val){
  var el=panel.querySelector('#'+id);
  if(el)el.textContent=val||'';
}
// Resolve a section by the data-field id it contains, then show/hide it based on the value.
// All Webflow detail sections share the same .detail-section class — we identify the section
// by the field-element's id and walk up to the nearest .detail-section ancestor.
// opts.subId/opts.subVal: optional secondary value (e.g. games-count-claim under games)
function setSection(panel,id,val,opts){
  var el=panel.querySelector('#'+id);
  if(!el)return;
  var sec=el.closest('.detail-section');
  if(!sec)return;
  var hasVal=!!val;
  var subVal=opts&&opts.subVal;
  if(!hasVal&&!subVal){sec.style.display='none';return}
  sec.style.display='';
  el.textContent=val||'—';
  if(opts&&opts.subId){
    var subEl=panel.querySelector('#'+opts.subId);
    if(subEl){
      subEl.textContent=subVal||'';
      subEl.style.display=subVal?'':'none';
    }
  }
}
function fillDetail(card){
  var p=document.querySelector('.detail-panel')||document.getElementById('detail-panel');
  if(!p)return;

  var type=field(card,'type').toLowerCase();
  var name=field(card,'name');
  var dist=slot(card,'district');
  var reg=slot(card,'region');
  var ctry=slot(card,'country');
  var freq=field(card,'frequency');
  var setting=field(card,'setting');
  var pricing=field(card,'pricing');
  var lang=field(card,'languages');
  var acc=field(card,'accessibility');
  var gl=parseInt(field(card,'game-level'),10);
  var fl=parseInt(field(card,'food-level'),10);

  // Detail type tag — set German label AND colour token class (tc/tb/tk)
  var dtEl=p.querySelector('#detail-type')||p.querySelector('.detail-type');
  if(dtEl){
    dtEl.classList.remove('tc','tb','tk');
    var dtTok=typeToken(type);
    if(dtTok)dtEl.classList.add(dtTok);
    dtEl.textContent=LBL.T[type]||type;
  }

  // Name (id=detail-name)
  setIdText(p,'detail-name',name);

  // Meta line + city line — Webflow has both #detail-meta and #detail-city; populate both
  var metaParts=[dist,reg];
  if(ctry&&ctry!=='DE'&&ctry!=='Deutschland')metaParts.push(ctry);
  var metaText=metaParts.filter(Boolean).join(' · ');
  setIdText(p,'detail-meta',metaText);
  setIdText(p,'detail-city',metaText);

  // Pills row (id=detail-pillen)
  var pillRow=p.querySelector('#detail-pillen')||p.querySelector('.detail-pillen-row,.detail-pillen');
  if(pillRow){
    pillRow.innerHTML='';
    if(freq&&LBL.F[freq])pill(pillRow,'',LBL.F[freq]);
    if(setting)setting.split(',').map(function(x){return x.trim()}).filter(Boolean).forEach(function(s){
      if(LBL.S[s])pill(pillRow,'',LBL.S[s])
    });
    if(lang)lang.split(',').map(function(x){return x.trim()}).filter(Boolean).forEach(function(l){
      if(LBL.L[l])pill(pillRow,'detail-pill-lang',LBL.L[l])
    });
    if(acc)acc.split(',').map(function(x){return x.trim()}).filter(Boolean).forEach(function(a){
      if(LBL.A[a])pill(pillRow,'detail-pill-access',LBL.A[a])
    });
  }

  // Each section is a sibling .detail-section. We resolve sections by the data-field id
  // they contain, then show/hide the whole section based on whether the value is present.
  // Webflow renders Designer placeholder text (e.g. "Beschreibung wird hier angezeigt.")
  // into these elements, so we MUST overwrite — clearing alone is not enough.
  setSection(p,'detail-desc',slot(card,'description'));
  setSection(p,'detail-game',gl?LBL.G[gl]:'',
             {subId:'detail-game-claim',subVal:slot(card,'games-count-claim')});
  setSection(p,'detail-food',fl?LBL.FD[fl]:'');
  setSection(p,'detail-pricing',pricing?(LBL.P[pricing]||pricing):'',
             {subId:'detail-pricing-detail',subVal:slot(card,'pricing-detail')});
  setSection(p,'detail-address',slot(card,'address'));
  setSection(p,'detail-hours',slot(card,'hours'));

  // Web link (id=detail-web is the <a> itself, not a section wrapper)
  var web=slot(card,'web');
  var wa=p.querySelector('#detail-web');
  var webSec=wa?wa.closest('.detail-section'):null;
  if(wa&&webSec){
    if(web&&!/example\.com/i.test(web)){
      webSec.style.display='';
      var href=web.indexOf('http')===0?web:'https://'+web;
      wa.setAttribute('href',href);
      wa.textContent=web.replace(/^https?:\/\//,'').replace(/\/$/,'');
    }else{
      webSec.style.display='none';
    }
  }

  p.classList.add('open');
}
function closeDetail(){
  var p=document.querySelector('.detail-panel')||document.getElementById('detail-panel');
  if(p)p.classList.remove('open');
}

// Map a type code to its V11-style colour token suffix (used on .type-tag and #detail-type)
function typeToken(type){return type==='cafe'?'tc':type==='bar'?'tb':type==='club'?'tk':''}

// Mutate the card's .type-tag element: add colour token class and German label text.
// The card DOM ships with English type-text ("club") and no colour class.
// V11 used to do this; V15 takes over.
function decorateCardTypeTag(card,type){
  var tag=card.querySelector('.type-tag');
  if(!tag)return;
  var token=typeToken(type);
  // Idempotent: remove any prior token, add current
  tag.classList.remove('tc','tb','tk');
  if(token)tag.classList.add(token);
  // Replace the text. The wrapping span (if any) holds the label.
  var span=tag.querySelector('span')||tag;
  var labelEl=span;
  var label=LBL.T[type]||labelEl.textContent.trim();
  if(labelEl.textContent.trim()!==label)labelEl.textContent=label;
}

// ---- Marker management ----
function addMarkerForCard(card){
  var lat=parseFloat(card.getAttribute('data-lat'));
  var lng=parseFloat(card.getAttribute('data-lng'));
  var type=field(card,'type').toLowerCase();
  // Always decorate the type-tag (even if marker already exists) — idempotent.
  decorateCardTypeTag(card,type);
  if(!isFinite(lat)||!isFinite(lng))return false;
  var id=card.getAttribute('data-location-id')||(lat.toFixed(5)+','+lng.toFixed(5));
  if(state.markers[id])return false;
  var marker=L.marker([lat,lng],{icon:makeIcon(type)});
  marker.on('click',function(){
    fillDetail(card);
    state.map.flyTo([lat,lng],13,{duration:0.6});
  });
  state.markers[id]={marker:marker,card:card,lat:lat,lng:lng,type:type};
  // Bind click on card itself (sidebar list)
  if(!card.dataset.bgpV15Bound){
    card.dataset.bgpV15Bound='1';
    card.addEventListener('click',function(e){
      if(e.target.closest('a,button,input,textarea,select'))return;
      fillDetail(card);
      state.map.flyTo([lat,lng],13,{duration:0.6});
    });
  }
  return true;
}

function syncMarkerToFilter(id){
  // Apply current filter to a single marker. Returns true if visible.
  var entry=state.markers[id];if(!entry)return false;
  var card=entry.card;
  var hidden=card.classList.contains('hidden');
  var onMap=state.map.hasLayer(entry.marker);
  if(hidden&&onMap){state.map.removeLayer(entry.marker);return false}
  if(!hidden&&!onMap){entry.marker.addTo(state.map);return true}
  return !hidden;
}

// ---- Filter logic ----
function cardMatches(card){
  var f=state.filter;
  // Type
  if(f.type!=='all'){
    var t=field(card,'type').toLowerCase();
    if(t!==f.type)return false;
  }
  // Pricing
  if(f.pricing.size>0){
    var p=field(card,'pricing');
    if(!f.pricing.has(p))return false;
  }
  // Game level
  if(f.gameLevel>0){
    var gl=parseInt(field(card,'game-level'),10);
    if(!gl||gl<f.gameLevel)return false;
  }
  // Food level
  if(f.foodLevel>0){
    var fl=parseInt(field(card,'food-level'),10);
    if(!fl||fl<f.foodLevel)return false;
  }
  // Search
  if(f.search){
    var q=f.search.toLowerCase();
    var hay=[
      field(card,'name'),
      slot(card,'district'),
      slot(card,'region'),
      slot(card,'address'),
      slot(card,'description'),
      slot(card,'games')
    ].join(' ').toLowerCase();
    if(hay.indexOf(q)<0)return false;
  }
  return true;
}

function applyFilter(){
  var visible=0;
  document.querySelectorAll('.location-card').forEach(function(card){
    var match=cardMatches(card);
    card.classList.toggle('hidden',!match);
    if(match)visible++;
  });
  // Sync marker visibility against new card.hidden states
  Object.keys(state.markers).forEach(function(id){syncMarkerToFilter(id)});
  updateCount();
  return visible;
}

function updateCount(){
  var rc=document.getElementById('results-count');if(!rc)return;
  var visible=document.querySelectorAll('.location-card:not(.hidden)').length;
  rc.textContent=visible+' Orte gefunden';
}

// ---- Filter UI wiring ----
function wireFilters(){
  // Type chips
  document.querySelectorAll('[data-filter-type]').forEach(function(chip){
    chip.addEventListener('click',function(e){
      e.preventDefault();
      document.querySelectorAll('[data-filter-type]').forEach(function(c){c.classList.remove('active')});
      chip.classList.add('active');
      state.filter.type=chip.getAttribute('data-filter-type')||'all';
      applyFilter();
    });
  });
  // Pricing chips (within filter UI only — exclude card-internal chips by scoping to a known container)
  // Filter UI pricing chips are inside #pricing-chips
  var pricingContainer=document.getElementById('pricing-chips');
  if(pricingContainer){
    pricingContainer.querySelectorAll('[data-pricing]').forEach(function(chip){
      chip.addEventListener('click',function(e){
        e.preventDefault();
        var p=chip.getAttribute('data-pricing');
        if(state.filter.pricing.has(p)){state.filter.pricing.delete(p);chip.classList.remove('active')}
        else{state.filter.pricing.add(p);chip.classList.add('active')}
        applyFilter();
      });
    });
  }
  // Range sliders
  var gameSlider=document.getElementById('game-level');
  var foodSlider=document.getElementById('food-level');
  var gameLabel=document.getElementById('game-level-label');
  var foodLabel=document.getElementById('food-level-label');
  if(gameSlider){
    gameSlider.addEventListener('input',function(){
      var v=parseInt(gameSlider.value,10)||0;
      state.filter.gameLevel=v;
      if(gameLabel)gameLabel.textContent=v===0?'Alle':LBL.G[v];
      applyFilter();
    });
  }
  if(foodSlider){
    foodSlider.addEventListener('input',function(){
      var v=parseInt(foodSlider.value,10)||0;
      state.filter.foodLevel=v;
      if(foodLabel)foodLabel.textContent=v===0?'Alle':LBL.FD[v];
      applyFilter();
    });
  }
  // Search
  var search=document.getElementById('search-input');
  if(search){
    var t=null;
    search.addEventListener('input',function(){
      clearTimeout(t);
      t=setTimeout(function(){
        state.filter.search=search.value.trim();
        applyFilter();
      },120);
    });
  }
  // Reset button (defensive — element may be absent)
  var reset=document.querySelector('.reset-filters,#reset-filters,[data-reset-filters]');
  if(reset){
    reset.addEventListener('click',function(e){
      e.preventDefault();
      state.filter.type='all';
      state.filter.pricing.clear();
      state.filter.gameLevel=0;
      state.filter.foodLevel=0;
      state.filter.search='';
      document.querySelectorAll('[data-filter-type]').forEach(function(c){c.classList.toggle('active',c.getAttribute('data-filter-type')==='all')});
      if(pricingContainer)pricingContainer.querySelectorAll('[data-pricing]').forEach(function(c){c.classList.remove('active')});
      if(gameSlider){gameSlider.value=0;if(gameLabel)gameLabel.textContent='Alle'}
      if(foodSlider){foodSlider.value=0;if(foodLabel)foodLabel.textContent='Alle'}
      if(search)search.value='';
      applyFilter();
    });
  }
  // Detail close button
  document.addEventListener('click',function(e){
    if(e.target.closest('.detail-close'))closeDetail();
  });
}

// ---- Map init ----
function findMapEl(){
  return document.getElementById('map')||document.querySelector('.leaflet-container');
}
function initMap(){
  var el=findMapEl();
  if(!el)return false;
  // Some pages may have a Leaflet container already (intercept.js patched L.map);
  // grab existing instance if present.
  if(window.bgpMap&&typeof window.bgpMap.eachLayer==='function'){
    state.map=window.bgpMap;
    // Wipe any existing markers from prior layers
    var toRemove=[];
    state.map.eachLayer(function(l){if(l instanceof L.Marker)toRemove.push(l)});
    toRemove.forEach(function(l){state.map.removeLayer(l)});
  }else{
    // Fresh init. Center on Germany; bounds get fit later once markers are in.
    state.map=L.map(el,{zoomControl:true}).setView([51.2,10.4],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap',maxZoom:19
    }).addTo(state.map);
    window.bgpMap=state.map;
  }
  return true;
}

// ---- Bootstrap & MutationObserver for late-loading cards ----
function processAllCards(){
  var added=0,visibleAdded=0;
  document.querySelectorAll('.location-card').forEach(function(card){
    if(addMarkerForCard(card))added++;
  });
  // Apply current filter to all (this also adds visible markers to map)
  Object.keys(state.markers).forEach(function(id){
    if(syncMarkerToFilter(id))visibleAdded++;
  });
  updateCount();
  if(added>0)console.log('[BGP V15] +'+added+' markers (cards: '+document.querySelectorAll('.location-card').length+')');
  // Initial fitBounds once we have a usable set
  if(!state.initialFitDone&&visibleAdded>=10){
    var bounds=[];
    Object.keys(state.markers).forEach(function(id){
      var e=state.markers[id];
      if(state.map.hasLayer(e.marker))bounds.push([e.lat,e.lng]);
    });
    if(bounds.length>=2){
      state.map.fitBounds(bounds,{padding:[40,40],maxZoom:11});
      state.initialFitDone=true;
    }
  }
}

function startObserving(){
  var listEl=document.querySelector('.w-dyn-items');
  if(!listEl)return;
  var debounce=null;
  new MutationObserver(function(){
    clearTimeout(debounce);
    debounce=setTimeout(processAllCards,150);
  }).observe(listEl,{childList:true,subtree:false});
  // Also: cards may have their .hidden class flipped externally. We're the ONLY filter authority,
  // so we don't expect this — but observe defensively.
  new MutationObserver(function(muts){
    var changed=false;
    muts.forEach(function(mu){
      if(mu.type==='attributes'&&mu.attributeName==='class'&&mu.target.classList&&mu.target.classList.contains('location-card')){
        changed=true;
      }
    });
    if(changed){
      Object.keys(state.markers).forEach(function(id){syncMarkerToFilter(id)});
      updateCount();
    }
  }).observe(listEl,{attributes:true,attributeFilter:['class'],subtree:true});
  window.addEventListener('fs-list-success',processAllCards);
  window.addEventListener('cmsload',processAllCards);
}

function bootstrap(){
  var checks=0;
  var iv=setInterval(function(){
    checks++;
    var mapReady=initMap();
    var cards=document.querySelectorAll('.location-card').length;
    if(mapReady&&cards>=20){
      clearInterval(iv);
      // Read initial filter UI state (in case Webflow renders an active chip)
      var activeType=document.querySelector('[data-filter-type].active');
      if(activeType)state.filter.type=activeType.getAttribute('data-filter-type')||'all';
      wireFilters();
      processAllCards();
      startObserving();
      // A few backup passes for late-arriving Finsweet content
      setTimeout(processAllCards,1000);
      setTimeout(processAllCards,3000);
      setTimeout(processAllCards,6000);
      console.log('[BGP V15] bootstrap complete');
      return;
    }
    if(checks>=80){
      clearInterval(iv);
      console.warn('[BGP V15] bootstrap timeout — running with what we have');
      if(mapReady){wireFilters();processAllCards();startObserving()}
    }
  },150);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootstrap);
}else{
  bootstrap();
}

} // end startV15

// Top-level entry: ensure Leaflet, then start
function entry(){
  loadLeafletIfNeeded(function(){startV15()});
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',entry);
}else{
  entry();
}

})();
