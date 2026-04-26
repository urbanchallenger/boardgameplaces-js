/*!
 * Board Game Places — V15 Single Layer Map
 * Version: 1.15.0
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
 */
(function(){'use strict';

var L=window.L;if(!L){console.error('[BGP V15] Leaflet not loaded');return}

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
function slotOrAttr(card,key,attr){
  return slot(card,key)||(attr?(card.getAttribute(attr)||''):'')
}

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
function setText(panel,sel,val){
  var el=panel.querySelector(sel);
  if(el)el.textContent=val||'';
}
function showSection(panel,sectionSel,fields){
  // fields: array of {sel, val} — section visible if any val truthy
  var sec=panel.querySelector(sectionSel);
  if(!sec)return;
  var anyValue=fields.some(function(f){return !!f.val});
  if(!anyValue){sec.style.display='none';return}
  sec.style.display='';
  fields.forEach(function(f){
    if(!f.sel)return;
    var el=sec.querySelector(f.sel);
    if(el)el.textContent=f.val||'';
  });
}
function fillDetail(card){
  var p=document.querySelector('.detail-panel')||document.getElementById('detail-panel');
  if(!p)return;

  var type=card.getAttribute('data-type')||'';
  var name=card.getAttribute('data-name')||'';
  var dist=slot(card,'district');
  var reg=slot(card,'region');
  var ctry=slot(card,'country');
  var freq=slotOrAttr(card,'frequency','data-frequency');
  var setting=slotOrAttr(card,'setting','data-setting');
  var pricing=slotOrAttr(card,'pricing','data-pricing');
  var lang=slotOrAttr(card,'languages','data-languages');
  var acc=slotOrAttr(card,'accessibility','data-accessibility');
  var gl=parseInt(slotOrAttr(card,'game-level','data-game-level'),10);
  var fl=parseInt(slotOrAttr(card,'food-level','data-food-level'),10);
  var games=slot(card,'games');

  setText(p,'.detail-type',LBL.T[type]||type);
  setText(p,'.detail-name',name);

  var metaParts=[dist,reg];
  if(ctry&&ctry!=='DE'&&ctry!=='Deutschland')metaParts.push(ctry);
  setText(p,'.detail-meta',metaParts.filter(Boolean).join(' · '));
  setText(p,'.detail-city',metaParts.filter(Boolean).join(' · '));

  // Pills row
  var pillRow=p.querySelector('.detail-pillen,.detail-pillen-row');
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

  showSection(p,'.detail-section-desc',[{sel:'.detail-desc',val:slot(card,'description')}]);
  showSection(p,'.detail-section-game',[
    {sel:'.detail-game',val:gl?LBL.G[gl]:''},
    {sel:'.detail-game-claim',val:slot(card,'games-count-claim')}
  ]);
  showSection(p,'.detail-section-food',[{sel:'.detail-food',val:fl?LBL.FD[fl]:''}]);
  showSection(p,'.detail-section-pricing',[
    {sel:'.detail-pricing',val:pricing?(LBL.P[pricing]||pricing):''},
    {sel:'.detail-pricing-detail',val:slot(card,'pricing-detail')}
  ]);
  showSection(p,'.detail-section-address',[{sel:'.detail-address',val:slot(card,'address')}]);
  showSection(p,'.detail-section-hours',[{sel:'.detail-hours',val:slot(card,'hours')}]);

  // Games (new slot - defensive, hide section if empty)
  showSection(p,'.detail-section-games',[{sel:'.detail-games',val:games}]);

  // Web link
  var webSec=p.querySelector('.detail-section-web');
  var web=slot(card,'web');
  if(webSec){
    if(web&&!/example\.com/i.test(web)){
      webSec.style.display='';
      var wa=webSec.querySelector('.detail-web');
      if(wa){
        var href=web.indexOf('http')===0?web:'https://'+web;
        wa.setAttribute('href',href);
        wa.textContent=web.replace(/^https?:\/\//,'').replace(/\/$/,'');
      }
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

// ---- Marker management ----
function addMarkerForCard(card){
  var lat=parseFloat(card.getAttribute('data-lat'));
  var lng=parseFloat(card.getAttribute('data-lng'));
  if(!isFinite(lat)||!isFinite(lng))return false;
  var id=card.getAttribute('data-location-id')||(lat.toFixed(5)+','+lng.toFixed(5));
  if(state.markers[id])return false;
  var type=(card.getAttribute('data-type')||'').toLowerCase();
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
    var t=(card.getAttribute('data-type')||'').toLowerCase();
    if(t!==f.type)return false;
  }
  // Pricing
  if(f.pricing.size>0){
    var p=slotOrAttr(card,'pricing','data-pricing');
    if(!f.pricing.has(p))return false;
  }
  // Game level
  if(f.gameLevel>0){
    var gl=parseInt(slotOrAttr(card,'game-level','data-game-level'),10);
    if(!gl||gl<f.gameLevel)return false;
  }
  // Food level
  if(f.foodLevel>0){
    var fl=parseInt(slotOrAttr(card,'food-level','data-food-level'),10);
    if(!fl||fl<f.foodLevel)return false;
  }
  // Search
  if(f.search){
    var q=f.search.toLowerCase();
    var hay=[
      card.getAttribute('data-name')||'',
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

})();
