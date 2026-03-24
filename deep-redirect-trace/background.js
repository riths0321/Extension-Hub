// Deep Redirect Trace v5 — background.js
// Full-featured: redirect tracking, TTL, fetch tools, history, loop detection
'use strict';

const MEM = {};
const TTL_MS = 30 * 60 * 1000;

function fresh() {
  return { hops:[], startTs:null, finalHeaders:{}, url:'', title:'', favicon:'', createdAt:Date.now() };
}
function ensure(id) { if (!MEM[id]) MEM[id] = fresh(); }

// ── TTL garbage collection every 5 min ────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const id of Object.keys(MEM)) {
    if (now - (MEM[id].createdAt||0) > TTL_MS) {
      delete MEM[id];
      chrome.storage.local.remove(`t${id}`).catch(()=>{});
    }
  }
}, 5*60*1000);

// ── Security header analysis ───────────────────────────────────
function secAnalysis(h) {
  return {
    hsts:  !!h['strict-transport-security'],
    csp:   !!h['content-security-policy'],
    xfo:   !!h['x-frame-options'],
    xcto:  !!h['x-content-type-options'],
    rp:    !!h['referrer-policy'],
    pp:    !!h['permissions-policy'],
    xr:    h['x-robots-tag']||null,
    score: ['strict-transport-security','content-security-policy','x-frame-options',
            'x-content-type-options','referrer-policy','permissions-policy'].filter(k=>!!h[k]).length
  };
}

// ── Redirect loop detection ────────────────────────────────────
function detectLoop(hops) {
  const seen = new Set();
  for (const h of hops) {
    if (seen.has(h.url)) return { detected:true, url:h.url };
    seen.add(h.url);
  }
  return { detected:false };
}

// ── Badge ──────────────────────────────────────────────────────
function badge(tabId) {
  const n = (MEM[tabId]?.hops||[]).length;
  const loop = detectLoop(MEM[tabId]?.hops||[]).detected;
  const text  = loop ? '∞' : n>1 ? String(n) : '';
  const color = loop ? '#dc2626' : n>4 ? '#dc2626' : n>1 ? '#d97706' : '#16a34a';
  chrome.action.setBadgeText({ text, tabId }).catch(()=>{});
  chrome.action.setBadgeBackgroundColor({ color, tabId }).catch(()=>{});
}

function save(id) {
  const d = MEM[id]; if(d) chrome.storage.local.set({[`t${id}`]:d}).catch(()=>{});
}

// Save to URL history (last 20 analyzed)
function saveHistory(url, hopCount) {
  chrome.storage.local.get('drt_history', r => {
    const hist = r.drt_history || [];
    const entry = { url, hopCount, ts: Date.now() };
    const filtered = hist.filter(h => h.url !== url);
    const newHist = [entry, ...filtered].slice(0, 20);
    chrome.storage.local.set({ drt_history: newHist });
  });
}

// ── webNavigation: reset on navigation ────────────────────────
chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (d.frameId !== 0) return;
  MEM[d.tabId] = fresh();
  MEM[d.tabId].startTs = d.timeStamp;
  MEM[d.tabId].url = d.url;
  badge(d.tabId);
  save(d.tabId);
});

// ── webRequest: capture response headers ───────────────────────
chrome.webRequest.onHeadersReceived.addListener(
  d => {
    if (d.frameId!==0||d.tabId<0) return;
    ensure(d.tabId);
    const C = MEM[d.tabId];
    const prev = C.hops.length ? C.hops[C.hops.length-1]._ts : (C.startTs||d.timeStamp);
    const timing = Math.max(1, Math.round(d.timeStamp - prev));
    const h = {};
    (d.responseHeaders||[]).forEach(r=>{ h[r.name.toLowerCase()]=r.value; });
    C.hops.push({ url:d.url, statusCode:d.statusCode, timing, headers:h, security:secAnalysis(h), _ts:d.timeStamp });
    if (d.statusCode===200) C.finalHeaders = h;
    badge(d.tabId);
    save(d.tabId);
    // detect loop after each hop
    const loop = detectLoop(C.hops);
    if (loop.detected) {
      C.loopDetected = true;
      C.loopUrl = loop.url;
    }
  },
  { urls:['<all_urls>'], types:['main_frame'] },
  ['responseHeaders']
);

// ── Tab updated ────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status==='complete' && MEM[tabId]) {
    Object.assign(MEM[tabId], { title:tab.title||'', favicon:tab.favIconUrl||'', url:tab.url||'' });
    save(tabId);
    if (MEM[tabId].hops.length > 0) saveHistory(tab.url||'', MEM[tabId].hops.length);
    chrome.runtime.sendMessage({ type:'TAB_READY', tabId }).catch(()=>{});
  }
});

// ── SPA detection ──────────────────────────────────────────────
chrome.webNavigation.onHistoryStateUpdated.addListener(d => {
  if (d.frameId!==0) return;
  if (MEM[d.tabId]) chrome.runtime.sendMessage({ type:'SPA_NAV', tabId:d.tabId }).catch(()=>{});
});

// ── Tab close cleanup ──────────────────────────────────────────
chrome.tabs.onRemoved.addListener(id => {
  delete MEM[id];
  chrome.storage.local.remove(`t${id}`).catch(()=>{});
});

// ══ FETCH TOOLS ════════════════════════════════════════════════

// Manual redirect trace (HEAD chain)
async function traceUrl(startUrl) {
  const hops=[]; let cur=startUrl; const seen=new Set();
  for (let i=0; i<15; i++) {
    if (seen.has(cur)) { hops.push({url:cur,statusCode:0,timing:0,headers:{},security:{score:0},loopDetected:true}); break; }
    seen.add(cur);
    const t0=Date.now();
    try {
      const resp = await fetch(cur,{method:'HEAD',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
      const t=Date.now()-t0; const h={};
      resp.headers.forEach((v,k)=>{h[k]=v;});
      hops.push({url:cur,statusCode:resp.status,timing:t,headers:h,security:secAnalysis(h)});
      if ([301,302,303,307,308].includes(resp.status)) {
        const loc=h['location']; if(!loc) break;
        try{cur=new URL(loc,cur).href;}catch{cur=loc;}
      } else break;
    } catch(e) {
      hops.push({url:cur,statusCode:0,timing:Date.now()-t0,headers:{},security:{score:0},error:e.message});
      break;
    }
  }
  return hops;
}

// Robots.txt
async function fetchRobots(base) {
  try {
    if(!base||typeof base!=='string'||!base.startsWith('http'))throw new Error('Invalid URL');
    const u=new URL(base); const url=`${u.protocol}//${u.host}/robots.txt`;
    const t0=Date.now(); const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
    const txt=await r.text(); const timing=Date.now()-t0;
    return {ok:true,url,statusCode:r.status,timing,raw:txt.substring(0,10000),parsed:parseRobots(txt)};
  } catch(e){return{ok:false,error:e.message||'Failed to fetch robots.txt'};}
}
function parseRobots(txt) {
  const lines=txt.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  const agents={}, sitemaps=[], crawlDelay={};
  let cur='*';
  for (const line of lines) {
    const col=line.indexOf(':'); if(col<0) continue;
    const k=line.substring(0,col).trim().toLowerCase();
    const v=line.substring(col+1).trim();
    if(k==='user-agent'){cur=v||'*';if(!agents[cur])agents[cur]={allow:[],disallow:[]};}
    else if(k==='disallow'){if(agents[cur])agents[cur].disallow.push(v||'/');}
    else if(k==='allow'){if(agents[cur])agents[cur].allow.push(v);}
    else if(k==='sitemap')sitemaps.push(v);
    else if(k==='crawl-delay')crawlDelay[cur]=parseFloat(v);
  }
  return{agents,sitemaps,crawlDelay};
}

// Sitemap
async function fetchSitemap(base) {
  try {
    if(!base||typeof base!=='string'||!base.startsWith('http'))throw new Error('Invalid URL');
    const u=new URL(base); const url=`${u.protocol}//${u.host}/sitemap.xml`;
    const t0=Date.now(); const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});
    const xml=await r.text(); const timing=Date.now()-t0;
    return{ok:true,url,statusCode:r.status,timing,parsed:parseSitemap(xml)};
  } catch(e){return{ok:false,error:e.message||'Failed to fetch sitemap.xml'};}
}
function parseSitemap(xml) {
  if (xml.includes('<sitemapindex')) {
    const locs=[...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(m=>m[1].trim());
    return{type:'index',count:locs.length,sitemaps:locs.slice(0,20)};
  }
  const urls=[...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  return{type:'urlset',count:urls.length,items:urls.slice(0,50).map(m=>{
    const g=(tag)=>(m[1].match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`))?.[1]||'').trim();
    return{loc:g('loc'),lastmod:g('lastmod'),priority:g('priority'),changefreq:g('changefreq')};
  })};
}

// Broken link checker
async function checkBroken(links) {
  const results=[]; const MAX=40;
  const toCheck=links.filter(l=>l.startsWith('http')).slice(0,MAX);
  await Promise.allSettled(toCheck.map(async url=>{
    const t0=Date.now();
    try{
      const r=await fetch(url,{method:'HEAD',redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(6000)});
      results.push({url,status:r.status,timing:Date.now()-t0,broken:r.status>=400});
    }catch{results.push({url,status:0,timing:Date.now()-t0,broken:true,error:'Network error'});}
  }));
  return results;
}

// All tracked tabs
async function getAllTabs() {
  const tabs=await chrome.tabs.query({});
  return tabs.filter(t=>MEM[t.id]?.hops?.length>0).map(t=>({
    tabId:t.id,title:t.title||'',url:t.url||'',
    favicon:t.favIconUrl||'',hopCount:MEM[t.id].hops.length,active:t.active,
    loopDetected:MEM[t.id].loopDetected||false
  }));
}

// ── Message router ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg,_,res)=>{
  if(!msg||typeof msg.type!=='string') return false;
  switch(msg.type){
    case 'GET_DATA':{
      const m=MEM[msg.tabId];
      if(m){res({ok:true,data:m});return false;}
      chrome.storage.local.get(`t${msg.tabId}`,r=>{res({ok:true,data:r[`t${msg.tabId}`]||fresh()});});
      return true;
    }
    case 'TRACE':
      traceUrl(msg.url).then(h=>res({ok:true,hops:h})).catch(e=>res({ok:false,err:e.message}));
      return true;
    case 'FETCH_ROBOTS':
      fetchRobots(msg.url).then(r=>res({ok:true,data:r})).catch(e=>res({ok:false,err:e.message}));
      return true;
    case 'FETCH_SITEMAP':
      fetchSitemap(msg.url).then(r=>res({ok:true,data:r})).catch(e=>res({ok:false,err:e.message}));
      return true;
    case 'CHECK_BROKEN':
      checkBroken(msg.links||[]).then(r=>res({ok:true,data:r})).catch(e=>res({ok:false,err:e.message}));
      return true;
    case 'CLEAR':
      MEM[msg.tabId]=fresh();
      chrome.storage.local.remove(`t${msg.tabId}`).catch(()=>{});
      badge(msg.tabId);
      res({ok:true}); return false;
    case 'ALL_TABS':
      getAllTabs().then(t=>res({ok:true,tabs:t})); return true;
    case 'GET_HISTORY':
      chrome.storage.local.get('drt_history',r=>res({ok:true,history:r.drt_history||[]}));
      return true;
    case 'CLEAR_HISTORY':
      chrome.storage.local.set({drt_history:[]},()=>res({ok:true})); return true;
    default: return false;
  }
});
