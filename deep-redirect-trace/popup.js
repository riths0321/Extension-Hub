// Deep Redirect Trace v5 — popup.js
'use strict';
const S={chain:[],seo:null,tab:null,hdrHop:0,linkFilter:'nofollow',broken:[],brokenDone:false,secScore:0};
window.PopupApp={toast:(m)=>showToast(m),goToHeaders:(i)=>{S.hdrHop=i;switchTab('headers');renderHeaders();}};

document.addEventListener('DOMContentLoaded',async()=>{
  initTheme();initNav();initLinkFilters();initButtons();await init();
  chrome.runtime.onMessage.addListener(m=>{
    if(!m)return;
    if((m.type==='TAB_READY'||m.type==='SPA_NAV')&&S.tab?.id===m.tabId)loadAndRender();
  });
});

async function init(){
  setMsg('Detecting active tab…');
  try{
    const[tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.url||tab.url.startsWith('chrome://')||tab.url.startsWith('about:')){showErr('Cannot analyze browser internal pages.\nNavigate to any website.');return;}
    S.tab=tab;
    try{document.getElementById('hdrDomain').textContent=new URL(tab.url).hostname;}catch{}
    await loadAndRender();
  }catch(e){showErr('Init error: '+e.message);}
}

async function loadAndRender(){
  setMsg('Fetching redirect data…');
  let chain=[];
  try{const r=await bg({type:'GET_DATA',tabId:S.tab.id});if(r?.ok&&r.data?.hops?.length)chain=r.data.hops;}catch{}
  if(!chain.length){
    setMsg('Tracing live redirects…');
    try{const r=await bg({type:'TRACE',url:S.tab.url});if(r?.ok&&r.hops?.length)chain=r.hops;}catch{}
  }
  if(!chain.length)chain=[{url:S.tab.url,statusCode:200,timing:0,headers:{},security:{score:0}}];
  S.chain=chain;
  // Detect loop
  S.loopInfo=detectLoop(chain);

  setMsg('Scanning SEO signals…');
  S.seo=null;
  try{const r=await chrome.tabs.sendMessage(S.tab.id,{type:'SCAN'});if(r?.ok)S.seo=r.data;}catch{
    try{await chrome.scripting.executeScript({target:{tabId:S.tab.id},files:['content.js']});await sleep(500);
      const r2=await chrome.tabs.sendMessage(S.tab.id,{type:'SCAN'});if(r2?.ok)S.seo=r2.data;}catch{}
  }

  renderAll();showDashboard();

  // Async broken link check
  if(!S.brokenDone){
    S.brokenDone=false;
    const links=(S.seo?.allLinks||[]).filter(l=>l.href?.startsWith('http')).map(l=>l.href).slice(0,40);
    if(links.length){
      const bp=document.getElementById('brokenProgress');
      if(bp)bp.innerHTML=`<div class="bp-running">🔍 Checking ${links.length} links for errors…</div>`;
      bg({type:'CHECK_BROKEN',links}).then(r=>{
        S.broken=r?.data||[];S.brokenDone=true;
        const bp2=document.getElementById('brokenProgress');
        if(bp2)bp2.innerHTML='';
        if(S.linkFilter==='broken')RenderLinks.renderList(S.seo,'broken','linkList',S.broken);
        const n=S.broken.filter(b=>b.broken).length;
        if(n>0)showToast(`⚠ ${n} broken link${n>1?'s':''} found`);
      }).catch(()=>{S.brokenDone=true;});
    }
  }
}

function detectLoop(chain){
  const seen=new Set();
  for(const h of chain){if(seen.has(h.url))return{detected:true,url:h.url};seen.add(h.url);}
  return{detected:false};
}

function renderAll(){
  renderStatBar();renderChainTab();renderHeaders();renderSEOTab();
  renderInsightsTab();renderLinksTab();renderSecurityTab();renderHealthTab();
}

function renderStatBar(){
  const tot=S.chain.reduce((s,h)=>s+(h.timing||0),0);
  const fin=S.chain[S.chain.length-1];const sc=fin?.statusCode;
  S.secScore=RenderAnalytics.getSecScore(fin?.headers);
  const{total,grade}=RenderAnalytics.calcHealth(S.seo,S.chain,S.secScore);
  sv('st-hops',S.chain.length,S.loopInfo?.detected?'err':S.chain.length>3?'err':S.chain.length>1?'warn':'ok');
  sv('st-sc',sc||'—',sc===200?'ok':(sc>=300&&sc<400)?'warn':sc?'err':'');
  sv('st-ms',tot?tot+'ms':'—',tot>2000?'err':tot>600?'warn':'ok');
  sv('st-health',`${total} ${grade}`,total>=80?'ok':total>=55?'warn':'err');
  sv('st-idx',S.seo?(S.seo.isIndexable?'Yes':'No'):'—',S.seo?(S.seo.isIndexable?'ok':'err'):'');
  sv('st-links',S.seo?.linkCount??'—','info');
  sv('st-sec',`${S.secScore}/6`,S.secScore>=5?'ok':S.secScore>=3?'warn':'err');
  function sv(id,v,cls){const e=document.getElementById(id);if(!e)return;e.textContent=v;e.className='sb-v'+(cls?' '+cls:'');}
}

function renderChainTab(){
  const hp=document.getElementById('hopPill');if(hp)hp.textContent=S.chain.length+' hop'+(S.chain.length!==1?'s':'');
  // Remove old loop alert if any
  const old=document.querySelector('.loop-alert');if(old)old.remove();
  RenderChain.renderFlow(S.chain,'chainFlow',S.loopInfo);
  RenderChain.renderHopCards(S.chain,'hopCards');
  RenderChain.renderTiming(S.chain,'timingGrid','timingTotal');
}

function renderHeaders(idx){
  if(idx!==undefined)S.hdrHop=idx;
  const hop=S.chain[S.hdrHop]||{};const hdrs=hop.headers||{};const entries=Object.entries(hdrs);
  // Hop tabs
  const tabsEl=document.getElementById('hdrHopTabs');
  if(tabsEl){tabsEl.innerHTML='';S.chain.forEach((h,i)=>{
    let host=h.url;try{host=new URL(h.url).hostname;}catch{}
    const btn=document.createElement('button');btn.className='ht-btn'+(i===S.hdrHop?' active':'');
    btn.textContent=`Hop ${i+1} · ${h.statusCode} · ${host.substring(0,20)}`;
    btn.addEventListener('click',()=>{S.hdrHop=i;renderHeaders(i);});
    tabsEl.appendChild(btn);
  });}
  const hdrPill=document.getElementById('hdrPill');
  if(hdrPill)hdrPill.textContent=entries.length+' headers';
  const body=document.getElementById('hdrBody');if(!body)return;
  if(!entries.length){body.innerHTML='<div class="empty-info">No headers captured for this hop.</div>';return;}
  const pri=['content-type','server','cache-control','x-robots-tag','location','content-encoding','vary','etag','last-modified','strict-transport-security','x-frame-options','x-content-type-options','x-powered-by','referrer-policy','content-security-policy','age','set-cookie','access-control-allow-origin'];
  const sorted=[...pri.filter(k=>hdrs[k]),...entries.map(([k])=>k).filter(k=>!pri.includes(k))];
  body.innerHTML=sorted.filter(k=>hdrs[k]).map(k=>`<div class="hdr-row"><span class="hdr-k">${E(k)}</span><span class="hdr-v">${E(hdrs[k])}</span></div>`).join('');
}

function renderSEOTab(){
  RenderSEO.renderHero(S.seo,S.chain,'seoHeroBox');
  RenderSEO.renderAudit(S.seo,'seoAudit');
  RenderSEO.renderSchema(S.seo,'schemaBox','schemaPill');
  RenderSEO.renderHeadingTree(S.seo,'headingTree');
  RenderSEO.renderKeywords(S.seo,'kwGrid');
  RenderSEO.renderHreflang(S.seo,'hreflangBox');
  RenderSEO.renderMixedContent(S.seo,'mixedContentBox');
  RenderSEO.renderSocial(S.seo,S.tab?.url,'socialBox');

  // Handle fallback images safely without inline onerror
  const ogImg=document.querySelector('.og-img-tag');
  if(ogImg){ogImg.addEventListener('error',()=>ogImg.parentElement.innerHTML='<span style="color:var(--t4)">Image failed</span>');}
  const twImg=document.querySelector('.tw-img-tag');
  if(twImg){twImg.addEventListener('error',()=>twImg.parentElement.style.display='none');}
}

function renderInsightsTab(){
  RenderSEO.renderInsights(S.seo,S.chain,'insightsBox');
}

function renderLinksTab(){
  RenderLinks.renderStats(S.seo,'linkStats');
  RenderLinks.renderList(S.seo,S.linkFilter,'linkList',S.broken);
  attachLinkCopyListeners();
}

function attachLinkCopyListeners(){
  const els=document.querySelectorAll('#linkList .li');
  els.forEach(el=>{
    el.addEventListener('click',()=>{
      const href=el.getAttribute('data-href');
      if(href){
        navigator.clipboard.writeText(href).then(()=>window.PopupApp?.toast('✓ Copied'));
      }
    });
  });
}

function renderSecurityTab(){
  const sc=RenderAnalytics.renderSecurity(S.chain,'secHero','secRows');
  S.secScore=sc;
  const el=document.getElementById('secPill');
  if(el){el.textContent=`${sc}/6 headers`;el.className=`pill ${sc>=5?'green':sc>=3?'amber':'red'}`;}
}

function renderHealthTab(){
  RenderAnalytics.renderHealth(S.seo,S.chain,S.secScore,'healthScore');
  RenderAnalytics.renderCWV(S.seo?.vitals,'cwvGrid');
  RenderAnalytics.renderPerf(S.seo,S.chain,'perfPanel');
}

function initTheme(){
  // Load theme preference from storage
  chrome.storage.local.get('drt_theme',r=>{
    const theme=r.drt_theme||'light';
    applyTheme(theme);
  });
  // Attach theme toggle button
  const btn=document.getElementById('btnTheme');
  if(btn)btn.addEventListener('click',toggleTheme);
}

function applyTheme(theme){
  if(theme==='dark'){
    document.documentElement.setAttribute('data-theme','dark');
  }else{
    document.documentElement.removeAttribute('data-theme');
  }
}

function toggleTheme(){
  const current=document.documentElement.getAttribute('data-theme')||'light';
  const newTheme=current==='dark'?'light':'dark';
  applyTheme(newTheme);
  chrome.storage.local.set({drt_theme:newTheme});
}

function initNav(){
  document.querySelectorAll('.nb').forEach(b=>{b.addEventListener('click',()=>switchTab(b.dataset.tab));});
}

function switchTab(name){
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tp').forEach(p=>p.classList.add('hidden'));
  const btn=document.querySelector(`.nb[data-tab="${name}"]`);
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('tab-'+name);
  if(panel)panel.classList.remove('hidden');
}

function initLinkFilters(){
  document.querySelectorAll('.lf').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('.lf').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');S.linkFilter=b.dataset.f;
      RenderLinks.renderList(S.seo,S.linkFilter,'linkList',S.broken);
    });
  });
}

function initButtons(){
  const btn=(id)=>document.getElementById(id);
  const sel=(s)=>document.querySelector(s);
  
  if(btn('btnRefresh'))btn('btnRefresh').addEventListener('click',async()=>{
    S.brokenDone=false;S.broken=[];
    try{await bg({type:'CLEAR',tabId:S.tab?.id});}catch{}
    await loadAndRender();
  });
  if(btn('btnAllTabs'))btn('btnAllTabs').addEventListener('click',()=>{
    const p=btn('allTabsPanel');if(!p)return;const nowOpen=p.classList.toggle('hidden');
    if(!nowOpen)loadAllTabs();
  });
  if(btn('atpClose'))btn('atpClose').addEventListener('click',()=>{
    const p=btn('allTabsPanel');if(p)p.classList.add('hidden');
  });
  if(btn('errRetry'))btn('errRetry').addEventListener('click',init);
  if(btn('btnJson'))btn('btnJson').addEventListener('click',exportJSON);
  if(btn('btnCsv'))btn('btnCsv').addEventListener('click',exportCSV);
  if(btn('btnCopy'))btn('btnCopy').addEventListener('click',copyReport);
  // Tools tab auto-load
  const toolBtn=sel('.nb[data-tab="tools"]');
  if(toolBtn)toolBtn.addEventListener('click',loadTools);
  
  if(btn('btnFetchRobots'))btn('btnFetchRobots').addEventListener('click',async()=>{
    fetchRobotsData();
  });
  if(btn('btnFetchSitemap'))btn('btnFetchSitemap').addEventListener('click',async()=>{
    fetchSitemapData();
  });
  if(btn('btnClearHistory'))btn('btnClearHistory').addEventListener('click',async()=>{
    await bg({type:'CLEAR_HISTORY'});
    const hl=btn('historyList');if(hl)hl.innerHTML='<div class="empty-info">History cleared</div>';
    showToast('✓ History cleared');
  });
  // Load history tab on click
  const histBtn=sel('.nb[data-tab="history"]');
  if(histBtn)histBtn.addEventListener('click',loadHistory);
}

async function fetchRobotsData(){
  const rb=document.getElementById('robotsBox');
  if(!rb)return;
  if(!S.tab?.url){rb.innerHTML='<div class="empty-info">⚠ No URL available. Please navigate to a website first.</div>';return;}
  rb.innerHTML='<div class="empty-info">🔍 Fetching robots.txt…</div>';
  try{
    const r=await bg({type:'FETCH_ROBOTS',url:S.tab.url});
    if(r?.ok){RenderSEO.renderRobots(r.data,'robotsBox');}
    else{rb.innerHTML=`<div class="empty-info">⚠ ${E(r?.err||r?.data?.error||'Failed to fetch robots.txt')}</div>`;}
  }catch(e){rb.innerHTML=`<div class="empty-info">⚠ Error: ${E(e.message)}</div>`;}
}

async function fetchSitemapData(){
  const sb=document.getElementById('sitemapBox');
  if(!sb)return;
  if(!S.tab?.url){sb.innerHTML='<div class="empty-info">⚠ No URL available. Please navigate to a website first.</div>';return;}
  sb.innerHTML='<div class="empty-info">🔍 Fetching sitemap.xml…</div>';
  try{
    const r=await bg({type:'FETCH_SITEMAP',url:S.tab.url});
    if(r?.ok){RenderSEO.renderSitemap(r.data,'sitemapBox');}
    else{sb.innerHTML=`<div class="empty-info">⚠ ${E(r?.err||r?.data?.error||'Failed to fetch sitemap.xml')}</div>`;}
  }catch(e){sb.innerHTML=`<div class="empty-info">⚠ Error: ${E(e.message)}</div>`;}
}

async function loadTools(){
  if(!S.tab?.url)return;
  // Auto-fetch both robots.txt and sitemap.xml in parallel
  const rb=document.getElementById('robotsBox');
  const sb=document.getElementById('sitemapBox');
  if(!rb||!sb)return;
  
  rb.innerHTML='<div class="empty-info">🔍 Fetching robots.txt…</div>';
  sb.innerHTML='<div class="empty-info">🔍 Fetching sitemap.xml…</div>';
  
  try{
    const[rr,rs]=await Promise.all([
      bg({type:'FETCH_ROBOTS',url:S.tab.url}),
      bg({type:'FETCH_SITEMAP',url:S.tab.url})
    ]);
    
    if(rr?.ok){RenderSEO.renderRobots(rr.data,'robotsBox');}
    else{rb.innerHTML=`<div class="empty-info">⚠ ${E(rr?.err||rr?.data?.error||'Failed to fetch robots.txt')}</div>`;}
    
    if(rs?.ok){RenderSEO.renderSitemap(rs.data,'sitemapBox');}
    else{sb.innerHTML=`<div class="empty-info">⚠ ${E(rs?.err||rs?.data?.error||'Failed to fetch sitemap.xml')}</div>`;}
  }catch(e){
    rb.innerHTML=`<div class="empty-info">⚠ Error: ${E(e.message)}</div>`;
    sb.innerHTML=`<div class="empty-info">⚠ Error: ${E(e.message)}</div>`;
  }
}

async function loadAllTabs(){
  const el=document.getElementById('atpList');
  if(!el)return;
  el.innerHTML='<div class="empty-info">Loading…</div>';
  try{
    const r=await bg({type:'ALL_TABS'}),tabs=r?.tabs||[];
    if(!tabs.length){el.innerHTML='<div class="empty-info">No tracked tabs yet</div>';return;}
    el.innerHTML=tabs.map(t=>{
      const bc=t.loopDetected?'loop':t.hopCount>3?'err':t.hopCount>1?'warn':'ok';
      return`<div class="at-item" data-id="${t.tabId}">
        ${t.favicon?`<img class="at-fav" src="${E(t.favicon)}">`:'<div class="at-fav"></div>'}
        <div class="at-info"><div class="at-title">${E(t.title||'Untitled')}</div><div class="at-url">${E(t.url)}</div></div>
        <span class="at-badge ${bc}">${t.loopDetected?'∞ Loop':t.hopCount+' hops'}</span>
      </div>`;
    }).join('');
    el.querySelectorAll('.at-item').forEach(item=>{
      item.addEventListener('click',async()=>{
        const id=parseInt(item.dataset.id);
        try{await chrome.tabs.update(id,{active:true});}catch{}
        const ap=document.getElementById('allTabsPanel');if(ap)ap.classList.add('hidden');
        const[t2]=await chrome.tabs.query({active:true,currentWindow:true});
        if(t2){S.tab=t2;try{document.getElementById('hdrDomain').textContent=new URL(t2.url).hostname;}catch{}}
        await loadAndRender();
      });
      const fav=item.querySelector('.at-fav');
      if(fav&&fav.tagName==='IMG')fav.addEventListener('error',()=>fav.style.display='none');
    });
  }catch{if(el)el.innerHTML='<div class="empty-info">Error</div>';}
}

async function loadHistory(){
  const el=document.getElementById('historyList');
  if(!el)return;
  el.innerHTML='<div class="empty-info">Loading…</div>';
  try{
    const r=await bg({type:'GET_HISTORY'}),hist=r?.history||[];
    if(!hist||!hist.length){el.innerHTML='<div class="empty-info">No history yet — visit some websites!</div>';return;}
    el.innerHTML=hist.map(h=>{
      const d=new Date(h.ts),ts=d.toLocaleDateString()+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
      const bc=h.hopCount>3?'err':h.hopCount>1?'warn':'ok';
      return`<div class="hist-item" data-url="${E(h.url)}">
        <span class="hist-hops at-badge ${bc}">${h.hopCount} hop${h.hopCount!==1?'s':''}</span>
        <span class="hist-url" title="${E(h.url)}">${E(h.url)}</span>
        <span class="hist-ts">${ts}</span>
      </div>`;
    }).join('');
    el.querySelectorAll('.hist-item').forEach(item=>{
      item.addEventListener('click',async()=>{
        const url=item.dataset.url;
        try{const[t]=await chrome.tabs.query({active:true,currentWindow:true});if(t)await chrome.tabs.update(t.id,{url});}catch{}
        switchTab('chain');
      });
    });
  }catch(e){
    if(el)el.innerHTML=`<div class="empty-info">Error loading history: ${E(e.message)}</div>`;
  }
}

// EXPORT
function exportJSON(){
  const hs=RenderAnalytics.calcHealth(S.seo,S.chain,S.secScore);
  const d={timestamp:new Date().toISOString(),url:S.tab?.url,healthScore:hs,redirectChain:S.chain.map(h=>({url:h.url,statusCode:h.statusCode,timing:h.timing,headers:h.headers})),seoSignals:S.seo,securityScore:S.secScore,brokenLinks:S.broken.filter(b=>b.broken),loopDetected:S.loopInfo?.detected||false};
  dl(JSON.stringify(d,null,2),'redirect-trace.json','application/json');showToast('✓ JSON exported');
}
function exportCSV(){
  let c='Hop,URL,Status,Timing(ms),Server,Cache-Control,Location\n';
  S.chain.forEach((h,i)=>{const hd=h.headers||{};c+=`${i+1},"${h.url}",${h.statusCode},${h.timing||0},"${hd.server||''}","${hd['cache-control']||''}","${hd.location||''}"\n`;});
  dl(c,'redirect-trace.csv','text/csv');showToast('✓ CSV exported');
}
async function copyReport(){
  const hs=RenderAnalytics.calcHealth(S.seo,S.chain,S.secScore);
  let r=`Deep Redirect Trace v5\n${'═'.repeat(54)}\nDate:         ${new Date().toLocaleString()}\nURL:          ${S.tab?.url}\nHealth Score: ${hs.total}/100 (Grade ${hs.grade})\n`;
  if(S.loopInfo?.detected)r+=`\n⚠ REDIRECT LOOP DETECTED: ${S.loopInfo.url}\n`;
  r+=`\nREDIRECT CHAIN (${S.chain.length} hops)\n${'─'.repeat(54)}\n`;
  S.chain.forEach((h,i)=>{r+=`  ${i+1}. [${h.statusCode}] ${h.url}  (${h.timing||0}ms)\n`;});
  if(S.seo){
    r+=`\nSEO AUDIT\n${'─'.repeat(54)}\n`;
    [['Title',S.seo.title],['Description',S.seo.description],['Indexable',S.seo.isIndexable],['Canonical',S.seo.canonical],['Robots',S.seo.robots],['H1',S.seo.h1s?.[0]],['Word Count',S.seo.wordCount],['Links',`${S.seo.linkCount} (${S.seo.nofollowCount} nofollow)`],['Mixed Content',S.seo.mixedContent?.hasMixedContent?'YES — issues found':'Clean']].forEach(([k,v])=>{r+=`  ${(k+':').padEnd(16)} ${v??'(not set)'}\n`;});
  }
  r+=`\nSECURITY: ${S.secScore}/6 headers present\n`;
  const broken=S.broken.filter(b=>b.broken);
  if(broken.length){r+=`\nBROKEN LINKS (${broken.length})\n${'─'.repeat(54)}\n`;broken.forEach(b=>{r+=`  [${b.status}] ${b.url}\n`;});}
  try{await navigator.clipboard.writeText(r);showToast('✓ Report copied');}catch{showToast('✗ Copy failed');}
}

// HELPERS
function bg(msg){return new Promise((res,rej)=>{try{chrome.runtime.sendMessage(msg,r=>{if(chrome.runtime.lastError){rej(new Error(chrome.runtime.lastError.message));return;}res(r);});}catch(e){rej(e);}});}
function dl(c,n,m){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:m}));a.download=n;a.click();}
function setMsg(m){
  const ll=document.getElementById('loadLabel');if(ll)ll.textContent=m;
  const sl=document.getElementById('stLoad');if(sl)sl.classList.remove('hidden');
  const se=document.getElementById('stErr');if(se)se.classList.add('hidden');
  document.querySelectorAll('.tp').forEach(e=>e.classList.add('hidden'));
}
function showDashboard(){
  const sl=document.getElementById('stLoad');if(sl)sl.classList.add('hidden');
  const se=document.getElementById('stErr');if(se)se.classList.add('hidden');
  switchTab('chain');
}
function showErr(m){
  const sl=document.getElementById('stLoad');if(sl)sl.classList.add('hidden');
  const se=document.getElementById('stErr');if(se)se.classList.remove('hidden');
  const em=document.getElementById('errMsg');if(em)em.textContent=m;
  document.querySelectorAll('.tp').forEach(e=>e.classList.add('hidden'));
}
function showToast(m){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=m;el.classList.remove('hidden');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.add('hidden'),2600);
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function E(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
