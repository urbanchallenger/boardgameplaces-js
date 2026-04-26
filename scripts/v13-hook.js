/*!
 * Board Game Places — Finsweet Marker Hook (V13)
 * Version: 1.13.5
 * Project: https://boardgameplaces.com
 * Repo: https://github.com/urbanchallenger/boardgameplaces-js
 * License: MIT
 *
 * After Finsweet List Load streams in CMS items beyond Webflow's 100-item cap, this hook fills in markers and click handlers for the cards V11 fix never saw. Uses window.bgpMap (set by intercept.js) and dedupes against existing markers via lat/lng key + location-id.
 * v1.13.4: also takes over the "X Orte gefunden" counter — V11's count was stuck at the first-batch size because V11's internal `it` array doesn't include Finsweet-loaded cards. We count visible .location-card DOM elements directly and write the result after V11's own filter pass.
 * v1.13.5: marker class fix — V13 now uses V11's existing `.bm` / `.bc` / `.bb` / `.bk` CSS instead of `.custom-marker` / `.tc` / `.tb` / `.tk` (which had no CSS, leaving floating letters without backgrounds). Also: V13 now mirrors V11's filter pass, hiding/showing its own markers when card.classList.toggle('hidden') changes, so filter clicks affect the entire map not just V11's first 100.
 */
(function(){'use strict';
var L=window.L;if(!L)return;
var mapInst=null,existing={},addedV13={};
function findMap(){
  if(mapInst)return mapInst;
  if(window.bgpMap&&window.bgpMap instanceof L.Map){mapInst=window.bgpMap;return mapInst}
  var c=document.querySelector('.leaflet-container');if(!c)return null;
  if(c._leaflet_map){mapInst=c._leaflet_map;return mapInst}
  var id=c._leaflet_id;
  if(id&&L.Map&&L.Map._instances&&L.Map._instances[id]){mapInst=L.Map._instances[id];return mapInst}
  return null
}
function snapshot(){var m=findMap();if(!m)return;m.eachLayer(function(l){if(l instanceof L.Marker){var ll=l.getLatLng();existing[ll.lat.toFixed(5)+','+ll.lng.toFixed(5)]=true}})}
// Use V11's existing CSS classes: bm + bc/bb/bk so we inherit V11's marker styling automatically.
function ic(t){var k=t==='cafe'?'bc':t==='bar'?'bb':'bk',l=t==='cafe'?'S':t==='bar'?'B':'C';return L.divIcon({className:'',html:'<div class="bm '+k+'"><span>'+l+'</span></div>',iconSize:[28,28],iconAnchor:[14,28]})}
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
if(acc&&M.A)acc.split(',').map(function(s){return s.trim()}).filter(Boolean).forEach(function(a){pill('detail-pill-access',M.A[a]||a)})}
sec('.detail-section-desc','.detail-desc',slot(card,'description'));
sec('.detail-section-game','.detail-game',gl?(M.G&&M.G[gl]):'','.detail-game-claim',slot(card,'games-count-claim'));
sec('.detail-section-food','.detail-food',fl?(M.FD&&M.FD[fl]):'');
sec('.detail-section-pricing','.detail-pricing',pricing?(M.P&&M.P[pricing])||pricing:'','.detail-pricing-detail',slot(card,'pricing-detail'));
sec('.detail-section-address','.detail-address',slot(card,'address'));
sec('.detail-section-hours','.detail-hours',slot(card,'hours'));
var ws=p.querySelector('.detail-section-web'),w=slot(card,'web');
if(ws){if(w&&!/example\.com/i.test(w)){ws.style.display='';var wa=ws.querySelector('.detail-web');if(wa){var h=w.indexOf('http')===0?w:'https://'+w;wa.setAttribute('href',h);wa.textContent=w.replace(/^https?:\/\//,'').replace(/\/$/,'')}}else ws.style.display='none'}
p.classList.add('open')}
function bind(card){if(card.dataset.bgpV13)return;card.dataset.bgpV13='1';card.addEventListener('click',function(){fill(card)})}
function updateCount(){
  var rc=document.getElementById('results-count');if(!rc)return;
  var cards=document.querySelectorAll('.location-card');
  var visible=0;
  for(var i=0;i<cards.length;i++){
    var c=cards[i];
    if(c.classList.contains('hidden'))continue;
    var cs=window.getComputedStyle(c);
    if(cs.display==='none')continue;
    visible++
  }
  rc.textContent=visible+' Orte gefunden'
}
// Sync each V13 marker's visibility against its card's hidden state.
// V11 uses card.classList.toggle('hidden', !ok) and removeLayer/addTo to filter its own markers.
// We mirror the same behaviour for V13-added markers.
function syncMarkerVisibility(){
  var m=findMap();if(!m)return;
  document.querySelectorAll('.location-card').forEach(function(card){
    var lat=parseFloat(card.getAttribute('data-lat')),lng=parseFloat(card.getAttribute('data-lng'));
    if(!isFinite(lat)||!isFinite(lng))return;
    var key=lat.toFixed(5)+','+lng.toFixed(5);
    var id=card.getAttribute('data-location-id')||key;
    var mk=addedV13[id];if(!mk)return;
    var hidden=card.classList.contains('hidden');
    var onMap=m.hasLayer(mk);
    if(hidden&&onMap)m.removeLayer(mk);
    else if(!hidden&&!onMap)mk.addTo(m)
  })
}
function scheduleSync(){setTimeout(function(){syncMarkerVisibility();updateCount()},80)}
function addMissing(){var m=findMap();if(!m){return}var added=0;
document.querySelectorAll('.location-card').forEach(function(card){
bind(card);
var lat=parseFloat(card.getAttribute('data-lat')),lng=parseFloat(card.getAttribute('data-lng'));
if(!isFinite(lat)||!isFinite(lng))return;
var key=lat.toFixed(5)+','+lng.toFixed(5);
var id=card.getAttribute('data-location-id')||key;
if(existing[key]||addedV13[id])return;
var t=(card.getAttribute('data-type')||'').toLowerCase();
var mk=L.marker([lat,lng],{icon:ic(t)}).addTo(m);
mk.on('click',function(){fill(card);m.flyTo([lat,lng],13,{duration:0.6})});
addedV13[id]=mk;existing[key]=true;added++});
if(added>0)console.log('[BGP V13.5] +'+added+' markers (total cards: '+document.querySelectorAll('.location-card').length+')');
syncMarkerVisibility();updateCount()}
function start(){snapshot();addMissing();
var le=document.querySelector('.w-dyn-items');
if(le){var t=null;new MutationObserver(function(){clearTimeout(t);t=setTimeout(addMissing,200)}).observe(le,{childList:true})}
window.addEventListener('fs-list-success',addMissing);window.addEventListener('cmsload',addMissing);
// React to V11's filter passes: it toggles 'hidden' on cards. We mirror that to V13 markers + counter.
document.addEventListener('click',function(e){if(e.target.closest('[data-filter-type], .pricing-chip, .filter-chip, .reset-filters'))scheduleSync()},true);
document.addEventListener('input',function(e){if(e.target.matches('input[type=search], input.search-input, input[type=range], input[type=text]'))scheduleSync()},true);
setTimeout(addMissing,2000);setTimeout(addMissing,5000);setTimeout(addMissing,9000)}
function wait(n){if(n<=0){console.warn('[BGP V13.5] map never found');return}if(findMap())start();else setTimeout(function(){wait(n-1)},200)}
if(document.readyState!=='loading'){setTimeout(function(){wait(80)},500)}
else{document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){wait(80)},500)})}
})();
