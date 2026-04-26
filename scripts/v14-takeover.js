/*!
 * Board Game Places — V14 Marker Takeover
 * Version: 1.14.1
 * Project: https://boardgameplaces.com
 * Repo: https://github.com/urbanchallenger/boardgameplaces-js
 * License: MIT
 *
 * Replaces V13 entirely. V11 was found to remove non-V11 markers from the map during its async filter passes,
 * which caused V13's markers (added for Finsweet-loaded cards beyond the first 100) to disappear shortly after creation.
 * V14 takes a different approach: once Finsweet has loaded all cards (or after a max wait), V14 wipes ALL existing
 * markers off the map and rebuilds them from the full DOM card list. From that point on, V14 owns marker visibility
 * and re-applies on every filter change observed via card.classList mutations.
 *
 * Side effects:
 * - V11's filter logic still toggles .hidden on cards as before (we observe that, not replace it)
 * - V11's submit form, list rendering, etc. all keep working
 * - V11's marker functions become dead weight; we just clear the markers it produced
 * v1.14.1: foreign-marker wipe — V11 keeps adding its own first-100 markers in async passes after V14's takeover,
 *          producing duplicates. V14 now maintains a Set of its own marker references and periodically removes any
 *          marker on the map that isn't in that Set.
 */
(function(){'use strict';
var L=window.L;if(!L)return;
var mapInst=null,v14Markers={},v14MarkerSet=null,taken=false;

function findMap(){
  if(mapInst)return mapInst;
  if(window.bgpMap&&typeof window.bgpMap.eachLayer==='function'){mapInst=window.bgpMap;return mapInst}
  var c=document.querySelector('.leaflet-container');
  if(c&&c._leaflet_map){mapInst=c._leaflet_map;return mapInst}
  return null
}

function ic(t){
  var k=t==='cafe'?'bc':t==='bar'?'bb':t==='club'?'bk':'bk';
  var l=t==='cafe'?'S':t==='bar'?'B':'C';
  return L.divIcon({className:'',html:'<div class="bm '+k+'"><span>'+l+'</span></div>',iconSize:[28,28],iconAnchor:[14,28]})
}

function slot(c,k){var s=c.querySelector('.bgp-data[data-key="'+k+'"]');return s?s.textContent.trim():''}
function gv(c,k,a){return slot(c,k)||(a?c.getAttribute(a)||'':'')}

function fill(card){
  var p=document.querySelector('.detail-panel')||document.getElementById('detail-panel');if(!p)return;
  var M=window.BGP_LBL||{};
  function st(s,v){var e=p.querySelector(s);if(e)e.textContent=v||''}
  function sec(par,vs,vv,xs,xx){var el=p.querySelector(par);if(!el)return;if(!vv&&!xx){el.style.display='none';return}el.style.display='';if(vs){var ve=el.querySelector(vs);if(ve)ve.textContent=vv||''}if(xs){var xe=el.querySelector(xs);if(xe)xe.textContent=xx||''}}
  var T=card.getAttribute('data-type'),N=card.getAttribute('data-name');
  var dist=slot(card,'district'),reg=slot(card,'region'),ctry=slot(card,'country');
  var freq=gv(card,'frequency','data-frequency'),setting=gv(card,'setting','data-setting');
  var pricing=gv(card,'pricing','data-pricing'),lang=gv(card,'languages','data-languages')||'';
  var acc=gv(card,'accessibility','data-accessibility')||'';
  var gl=parseInt(gv(card,'game-level','data-game-level'),10);
  var fl=parseInt(gv(card,'food-level','data-food-level'),10);
  st('.detail-type',(M.T&&M.T[T])||T||'');
  st('.detail-name',N||'');
  st('.detail-meta',[dist,reg,(ctry&&ctry!=='DE'&&ctry!=='Deutschland')?ctry:''].filter(Boolean).join(' · '));
  var pl=p.querySelector('.detail-pillen');
  if(pl){pl.innerHTML='';
    var pill=function(c,t){var s=document.createElement('span');s.className='detail-pill '+c;s.textContent=t;pl.appendChild(s)};
    if(freq&&M.F)pill('',M.F[freq]||freq);
    if(setting&&M.S)setting.split(',').map(function(s){return s.trim()}).filter(Boolean).forEach(function(s){pill('',M.S[s]||s)});
    if(lang&&M.L)lang.split(',').map(function(s){return s.trim()}).filter(Boolean).forEach(function(l){pill('detail-pill-lang',M.L[l]||'🌐 '+l)});
    if(acc&&M.A)acc.split(',').map(function(s){return s.trim()}).filter(Boolean).forEach(function(a){pill('detail-pill-access',M.A[a]||a)})
  }
  sec('.detail-section-desc','.detail-desc',slot(card,'description'));
  sec('.detail-section-game','.detail-game',gl?(M.G&&M.G[gl]):'','.detail-game-claim',slot(card,'games-count-claim'));
  sec('.detail-section-food','.detail-food',fl?(M.FD&&M.FD[fl]):'');
  sec('.detail-section-pricing','.detail-pricing',pricing?(M.P&&M.P[pricing])||pricing:'','.detail-pricing-detail',slot(card,'pricing-detail'));
  sec('.detail-section-address','.detail-address',slot(card,'address'));
  sec('.detail-section-hours','.detail-hours',slot(card,'hours'));
  var ws=p.querySelector('.detail-section-web'),w=slot(card,'web');
  if(ws){if(w&&!/example\.com/i.test(w)){ws.style.display='';var wa=ws.querySelector('.detail-web');if(wa){var h=w.indexOf('http')===0?w:'https://'+w;wa.setAttribute('href',h);wa.textContent=w.replace(/^https?:\/\//,'').replace(/\/$/,'')}}else ws.style.display='none'}
  p.classList.add('open')
}

// Build the WeakSet of our own markers, so we can identify foreign markers (e.g. ones V11 keeps adding async)
function rebuildMarkerSet(){
  v14MarkerSet=new WeakSet();
  Object.keys(v14Markers).forEach(function(id){v14MarkerSet.add(v14Markers[id].marker)});
}

// Remove any Marker on the map that is NOT one we created (defends against V11 adding its first-100 markers late)
function wipeForeignMarkers(){
  var m=findMap();if(!m||!v14MarkerSet)return;
  var toRemove=[];
  m.eachLayer(function(l){
    if(l instanceof L.Marker&&!v14MarkerSet.has(l))toRemove.push(l);
  });
  toRemove.forEach(function(l){m.removeLayer(l)});
  if(toRemove.length>0)console.log('[BGP V14] wiped '+toRemove.length+' foreign markers');
}

// Re-attach our markers if V11's filter pass removed them. Respects card.hidden state.
function ensureOwnMarkersOnMap(){
  var m=findMap();if(!m)return;
  var reattached=0;
  Object.keys(v14Markers).forEach(function(id){
    var entry=v14Markers[id];
    var hidden=entry.card.classList.contains('hidden');
    var onMap=m.hasLayer(entry.marker);
    if(!hidden&&!onMap){entry.marker.addTo(m);reattached++}
    else if(hidden&&onMap)m.removeLayer(entry.marker);
  });
  if(reattached>0)console.log('[BGP V14] re-attached '+reattached+' markers V11 had removed');
}

// Take over: wipe all existing markers, rebuild from card DOM
function takeover(){
  var m=findMap();if(!m)return;
  if(taken){return}
  // Wipe every Marker layer on the map
  var toRemove=[];
  m.eachLayer(function(l){if(l instanceof L.Marker)toRemove.push(l)});
  toRemove.forEach(function(l){m.removeLayer(l)});
  // Rebuild from cards
  var added=0;
  document.querySelectorAll('.location-card').forEach(function(card){
    var lat=parseFloat(card.getAttribute('data-lat')),lng=parseFloat(card.getAttribute('data-lng'));
    if(!isFinite(lat)||!isFinite(lng))return;
    var id=card.getAttribute('data-location-id')||(lat+','+lng);
    if(v14Markers[id])return; // dedupe by location-id
    var t=(card.getAttribute('data-type')||'').toLowerCase();
    var mk=L.marker([lat,lng],{icon:ic(t)});
    mk.on('click',function(){fill(card);m.flyTo([lat,lng],13,{duration:0.6})});
    if(!card.classList.contains('hidden'))mk.addTo(m);
    v14Markers[id]={marker:mk,card:card};
    // Bind detail click on card too (V11 already does this for first 100; we re-bind to be safe)
    if(!card.dataset.bgpV14){card.dataset.bgpV14='1';card.addEventListener('click',function(e){if(e.target.closest('a,button'))return;fill(card)})}
    added++;
  });
  taken=true;
  rebuildMarkerSet();
  console.log('[BGP V14] took over: '+added+' markers (cards: '+document.querySelectorAll('.location-card').length+')');
  syncFilter();
  wipeForeignMarkers();
  updateCount();
}

// On filter change: respect each card's .hidden state
function syncFilter(){
  var m=findMap();if(!m)return;
  Object.keys(v14Markers).forEach(function(id){
    var entry=v14Markers[id];
    var hidden=entry.card.classList.contains('hidden');
    var onMap=m.hasLayer(entry.marker);
    if(hidden&&onMap)m.removeLayer(entry.marker);
    else if(!hidden&&!onMap)entry.marker.addTo(m)
  });
  updateCount();
}

function updateCount(){
  var rc=document.getElementById('results-count');if(!rc)return;
  var visible=0;
  document.querySelectorAll('.location-card').forEach(function(c){
    if(!c.classList.contains('hidden')&&window.getComputedStyle(c).display!=='none')visible++
  });
  rc.textContent=visible+' Orte gefunden'
}

// Watch for new cards arriving from Finsweet AND for hidden-class changes
function startWatching(){
  var le=document.querySelector('.w-dyn-items');
  if(le){
    var t=null;
    new MutationObserver(function(){
      clearTimeout(t);
      t=setTimeout(function(){
        // New cards arrived → re-takeover (wipe & rebuild) to catch them
        if(taken){
          // Find cards we don't yet have markers for
          var newOnes=0;
          document.querySelectorAll('.location-card').forEach(function(card){
            var lat=parseFloat(card.getAttribute('data-lat')),lng=parseFloat(card.getAttribute('data-lng'));
            if(!isFinite(lat)||!isFinite(lng))return;
            var id=card.getAttribute('data-location-id')||(lat+','+lng);
            if(v14Markers[id])return;
            var t2=(card.getAttribute('data-type')||'').toLowerCase();
            var mk=L.marker([lat,lng],{icon:ic(t2)});
            var m=findMap();if(!m)return;
            mk.on('click',function(){fill(card);m.flyTo([lat,lng],13,{duration:0.6})});
            if(!card.classList.contains('hidden'))mk.addTo(m);
            v14Markers[id]={marker:mk,card:card};
            if(!card.dataset.bgpV14){card.dataset.bgpV14='1';card.addEventListener('click',function(e){if(e.target.closest('a,button'))return;fill(card)})}
            newOnes++;
          });
          if(newOnes>0){
            rebuildMarkerSet();
            wipeForeignMarkers();
            console.log('[BGP V14] +'+newOnes+' markers from late load');
          }
          updateCount();
        }
      },150);
    }).observe(le,{childList:true,subtree:true});
  }
  // Filter clicks → re-sync visibility
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-filter-type], .pricing-chip, .filter-chip, .reset-filters')){
      setTimeout(syncFilter,80);
    }
  },true);
  document.addEventListener('input',function(e){
    if(e.target.matches('input[type=search], input.search-input, input[type=range], input[type=text]')){
      setTimeout(syncFilter,80);
    }
  },true);
  // Also watch each card for direct .hidden toggles (V11 does this in its filter passes)
  // We use a single MutationObserver on the parent that watches class changes on children
  var listEl=document.querySelector('.w-dyn-items');
  if(listEl){
    new MutationObserver(function(muts){
      var changed=false;
      muts.forEach(function(mu){
        if(mu.type==='attributes'&&mu.attributeName==='class'&&mu.target.classList.contains('location-card')){
          changed=true;
        }
      });
      if(changed)syncFilter();
    }).observe(listEl,{attributes:true,attributeFilter:['class'],subtree:true});
  }
  window.addEventListener('fs-list-success',syncFilter);
  window.addEventListener('cmsload',syncFilter);
}

// Wait for: map present AND a reasonable number of cards loaded (Finsweet should finish ~3s)
function bootstrap(){
  var checks=0;
  var iv=setInterval(function(){
    checks++;
    var m=findMap();
    var cardCount=document.querySelectorAll('.location-card').length;
    // Take over once we have the map and either: (a) all cards loaded (>=200, indicating Finsweet finished),
    // or (b) we've waited 4 seconds with at least 50 cards (so we don't wait forever on slow connections)
    if(m&&!taken){
      if(cardCount>=200||(checks>=20&&cardCount>=50)){
        clearInterval(iv);
        takeover();
        startWatching();
        // Backup re-takeovers in case Finsweet adds more after we ran
        setTimeout(function(){if(!taken)takeover()},2000);
        setTimeout(function(){syncFilter();updateCount()},3000);
        // Periodic foreign-marker wipe + re-attach own markers — V11 sometimes adds its own first-100 markers
        // asynchronously after our takeover, AND occasionally removes our markers during its filter passes.
        // We defend against both: wipe foreign markers, then re-attach any of ours that got dropped.
        var wipeCount=0;
        var wipeIv=setInterval(function(){
          wipeCount++;
          wipeForeignMarkers();
          ensureOwnMarkersOnMap();
          if(wipeCount>=16){clearInterval(wipeIv);
            // Final safety net: every 3s for another minute
            var slowWipeCount=0;
            var slowIv=setInterval(function(){
              slowWipeCount++;
              wipeForeignMarkers();
              ensureOwnMarkersOnMap();
              if(slowWipeCount>=20)clearInterval(slowIv);
            },3000);
          }
        },500);
        return;
      }
    }
    if(checks>=80){
      clearInterval(iv);
      console.warn('[BGP V14] bootstrap timeout — proceeding with what we have');
      if(m)takeover();
      startWatching();
    }
  },200);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootstrap);
}else{
  bootstrap();
}

})();
