// Deep Redirect Trace v5 — content.js
// Extended scanner: CWV, hreflang, mixed content, keywords, heading tree
'use strict';
if (window.__drt5) {} else {
window.__drt5 = true;

const MAX_LINKS=500, MAX_IMGS=300, MAX_H=100;

// ── Core Web Vitals ────────────────────────────────────────────
const CWV = { lcp:null, cls:0, fid:null, fcp:null, ttfb:null, inp:null };
try {
  if ('PerformanceObserver' in window) {
    const tryObs = (type, cb) => {
      try { new PerformanceObserver(l=>cb(l.getEntries())).observe({type,buffered:true}); } catch {}
    };
    tryObs('largest-contentful-paint', e => { if(e.length) CWV.lcp=Math.round(e[e.length-1].startTime); });
    tryObs('layout-shift', e => { for(const x of e) if(!x.hadRecentInput) CWV.cls=+(CWV.cls+x.value).toFixed(4); });
    tryObs('first-input', e => { if(e[0]&&CWV.fid===null) CWV.fid=Math.round(e[0].processingStart-e[0].startTime); });
    tryObs('event', e => { for(const x of e) if(x.duration>16&&(CWV.inp===null||x.duration>CWV.inp)) CWV.inp=Math.round(x.duration); });
    tryObs('paint', e => { for(const x of e) if(x.name==='first-contentful-paint') CWV.fcp=Math.round(x.startTime); });
  }
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) {
    CWV.ttfb = Math.round(nav.responseStart - nav.requestStart);
    CWV.domInteractive = Math.round(nav.domInteractive);
    CWV.domComplete = Math.round(nav.domComplete);
    CWV.transferSize = nav.transferSize || 0;
    CWV.encodedBodySize = nav.encodedBodySize || 0;
    CWV.decodedBodySize = nav.decodedBodySize || 0;
  }
} catch {}

// ── Resource timing ────────────────────────────────────────────
function getResourceCounts() {
  try {
    const res = performance.getEntriesByType('resource');
    const counts = { js:0, css:0, img:0, font:0, xhr:0, other:0, totalBytes:0 };
    for (const r of res) {
      const type = r.initiatorType;
      if (type==='script') counts.js++;
      else if (type==='link' && r.name.includes('.css')) counts.css++;
      else if (type==='img') counts.img++;
      else if (type==='font' || r.name.includes('font')) counts.font++;
      else if (type==='xmlhttprequest'||type==='fetch') counts.xhr++;
      else counts.other++;
      counts.totalBytes += r.encodedBodySize||0;
    }
    return counts;
  } catch { return {}; }
}

// ── Keyword density ────────────────────────────────────────────
function keywordDensity(text, topN=10) {
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','have','has','had','do','does','did','will','would','can','could','should','may','might','this','that','these','those','it','its','i','we','you','he','she','they','their','our','your','my','his','her','its','from','as','up','out','if','about','into','through','then','there','when','where','who','which','how','what','all','any','more','also','just','so','than','too','very','not','no','yes','get','got','use','used','make','made','said','say','see','know','go','come','take','give','look','want','well','new','first','last','long','great','good','own','old','right','big','high','small','large','next','early','young','important','public','private','real','best','free','able']);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g)||[];
  const freq = {};
  for (const w of words) { if(!stopWords.has(w)) freq[w]=(freq[w]||0)+1; }
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,topN).map(([w,c])=>({word:w,count:c,density:((c/words.length)*100).toFixed(2)}));
}

// ── Heading tree ───────────────────────────────────────────────
function getHeadingTree() {
  const headings = [];
  let count = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    if (count++ >= MAX_H) break;
    headings.push({ level: parseInt(h.tagName[1]), text: h.textContent.trim().substring(0,100) });
  }
  return headings;
}

// ── Mixed content detection ────────────────────────────────────
function detectMixedContent() {
  if (!location.protocol.includes('https')) return { isHttps:false, issues:[] };
  const issues = [];
  // Images
  for (const img of document.querySelectorAll('img[src^="http:"]')) {
    issues.push({ type:'image', url:img.getAttribute('src') });
    if (issues.length >= 20) break;
  }
  // Scripts
  for (const s of document.querySelectorAll('script[src^="http:"]')) {
    issues.push({ type:'script', url:s.getAttribute('src') });
    if (issues.length >= 20) break;
  }
  // Stylesheets
  for (const l of document.querySelectorAll('link[href^="http:"]')) {
    if (l.rel==='stylesheet') issues.push({ type:'stylesheet', url:l.getAttribute('href') });
    if (issues.length >= 20) break;
  }
  // iframes
  for (const f of document.querySelectorAll('iframe[src^="http:"]')) {
    issues.push({ type:'iframe', url:f.getAttribute('src') });
    if (issues.length >= 20) break;
  }
  return { isHttps:true, issues, hasMixedContent:issues.length>0 };
}

// ── Hreflang detection ─────────────────────────────────────────
function getHreflang() {
  const entries = [];
  for (const l of document.querySelectorAll('link[rel="alternate"][hreflang]')) {
    entries.push({ hreflang:l.getAttribute('hreflang'), href:l.getAttribute('href') });
  }
  return entries;
}

// ── Pagination ─────────────────────────────────────────────────
function getPagination() {
  return {
    prev: document.querySelector('link[rel="prev"]')?.getAttribute('href')||null,
    next: document.querySelector('link[rel="next"]')?.getAttribute('href')||null
  };
}

// ── Full scan ──────────────────────────────────────────────────
function fullScan() {
  const host=location.hostname, t0=performance.now();
  const q=s=>document.querySelector(s);
  const qa=(s,max)=>{const all=document.querySelectorAll(s);return Array.from({length:Math.min(all.length,max||9999)},(_,i)=>all[i]);};
  const mc=(n,a='content')=>q(`meta[name="${n}"]`)?.getAttribute(a)||null;
  const mp=(p)=>q(`meta[property="${p}"]`)?.content||null;

  // Robots
  const robotsEl=q('meta[name="robots"],meta[name="ROBOTS"]');
  const robots=robotsEl?.content||null;
  const isNoindex=robots?robots.toLowerCase().includes('noindex'):false;
  const isNofollow=robots?robots.toLowerCase().includes('nofollow'):false;

  // Headings
  const h1s=qa('h1',MAX_H).map(h=>h.textContent.trim().substring(0,120));
  const headingTree=getHeadingTree();
  const h2Count=document.querySelectorAll('h2').length;
  const h3Count=document.querySelectorAll('h3').length;

  // Images
  const imgEls=qa('img',MAX_IMGS);
  const imgCount=document.querySelectorAll('img').length;
  const noAltImgs=imgEls.filter(i=>!i.getAttribute('alt')).length;
  const lazyImgs=imgEls.filter(i=>i.getAttribute('loading')==='lazy').length;
  const webpImgs=imgEls.filter(i=>(i.src||'').match(/\.webp|\.avif/i)||(i.currentSrc||'').match(/\.webp|\.avif/i)).length;

  // Links
  const linkEls=qa('a[href]',MAX_LINKS);
  const totalLinkCount=document.querySelectorAll('a[href]').length;
  const nofollowLinks=[],followLinks=[],sponsoredLinks=[],ugcLinks=[],allLinks=[];
  let internal=0,external=0;
  for (const a of linkEls) {
    const rel=(a.getAttribute('rel')||'').toLowerCase();
    const href=a.getAttribute('href')||'';
    if(!href||href.startsWith('#')||href.startsWith('javascript:')) continue;
    const text=(a.innerText||a.textContent||'').trim().substring(0,80);
    const isNF=rel.includes('nofollow'),isSp=rel.includes('sponsored'),isUgc=rel.includes('ugc');
    let isExt=false;
    try{isExt=new URL(a.href).hostname!==host;}catch{}
    isExt?external++:internal++;
    const entry={href,text,isExternal:isExt,isNofollow:isNF,isSponsored:isSp,isUgc,rel};
    allLinks.push(entry);
    if(isNF){nofollowLinks.push(entry);a.style.outline='2px dashed #d97706';a.style.outlineOffset='2px';}
    if(isSp){sponsoredLinks.push(entry);a.style.outline='2px dashed #8B5CF6';a.style.outlineOffset='2px';}
    if(isUgc){ugcLinks.push(entry);a.style.outline='2px dashed #06b6d4';a.style.outlineOffset='2px';}
    if(!isNF && !isSp && !isUgc){
      if(followLinks.length<150) followLinks.push(entry);
    }
  }

  // Schemas
  const schemas=[];
  for(const s of document.querySelectorAll('script[type="application/ld+json"]')){
    try{const j=JSON.parse(s.textContent);const t=Array.isArray(j)?j.map(x=>x['@type']).join(', '):(j['@type']||'Unknown');schemas.push(t);}catch{}
  }

  // Resource hints
  const resourceHints=[];
  for(const l of qa('link[rel]',60)){
    const rel=l.rel?.toLowerCase();
    if(['preload','prefetch','preconnect','dns-prefetch','modulepreload'].includes(rel))
      resourceHints.push({rel:l.rel,href:l.getAttribute('href'),as:l.getAttribute('as')});
  }

  // Technology detection
  const tech=[];
  if(window.jQuery||window.$?.fn?.jquery) tech.push({name:'jQuery',icon:'⚡'});
  if(window.React||q('[data-reactroot],[data-react-helmet]')) tech.push({name:'React',icon:'⚛'});
  if(window.__NEXT_DATA__||q('#__NEXT_DATA__')) tech.push({name:'Next.js',icon:'▲'});
  if(window.Nuxt||window.__nuxt__) tech.push({name:'Nuxt',icon:'💚'});
  if(window.wp||q('link[href*="wp-content"]')) tech.push({name:'WordPress',icon:'🔵'});
  if(window.Shopify) tech.push({name:'Shopify',icon:'🛍'});
  if(window.Webflow) tech.push({name:'Webflow',icon:'🌊'});
  if(window.angular||window.ng) tech.push({name:'Angular',icon:'🔴'});
  if(window.Vue||window.__vue_app__) tech.push({name:'Vue.js',icon:'🟢'});
  if(window.gtag||window.ga) tech.push({name:'Google Analytics',icon:'📊'});
  if(window.fbq) tech.push({name:'Meta Pixel',icon:'📘'});
  if(window._hsq) tech.push({name:'HubSpot',icon:'🧡'});
  if(window.dataLayer) tech.push({name:'GTM',icon:'🏷'});

  // Content
  const bodyText=document.body?.innerText||'';
  const wordCount=bodyText.trim().split(/\s+/).filter(Boolean).length;
  const htmlSize=document.documentElement.outerHTML.length;
  const keywords=keywordDensity(bodyText);

  // Canonical
  const canonical=q('link[rel="canonical"]')?.href||null;
  const canonicalMismatch=canonical&&new URL(canonical,location.href).hostname!==host;

  return {
    url:location.href, title:document.title||'', lang:document.documentElement.lang||null,
    description:mc('description'), keywordsTag:mc('keywords'), robots, isIndexable:!isNoindex, isNoindex, isNofollow,
    canonical, canonicalMismatch,
    ogTitle:mp('og:title'), ogDesc:mp('og:description'), ogImage:mp('og:image'),
    ogType:mp('og:type'), ogUrl:mp('og:url'), ogSiteName:mp('og:site_name'),
    twCard:mc('twitter:card'), twTitle:mc('twitter:title'), twDesc:mc('twitter:description'), twImage:mc('twitter:image'),
    metaRefresh:q('meta[http-equiv="refresh"]')?.getAttribute('content')||null,
    viewport:mc('viewport'), charset:document.characterSet||null, themeColor:mc('theme-color'),
    h1s, headingTree, h2Count, h3Count,
    imgCount, noAltImgs, lazyImgs, webpImgs,
    linkCount:totalLinkCount, internalLinks:internal, externalLinks:external,
    nofollowLinks, followLinks, sponsoredLinks, ugcLinks, nofollowCount:nofollowLinks.length,
    sponsoredCount:sponsoredLinks.length, ugcCount:ugcLinks.length, allLinks:allLinks.slice(0, 300),
    wordCount, htmlSize, keywords,
    schemas, resourceHints, technologies:tech,
    hreflang:getHreflang(), pagination:getPagination(),
    mixedContent:detectMixedContent(),
    vitals:{...CWV}, resources:getResourceCounts(),
    scanDuration:Math.round(performance.now()-t0)
  };
}

chrome.runtime.onMessage.addListener((msg,_,res)=>{
  if(!msg||msg.type!=='SCAN') return false;
  try{res({ok:true,data:fullScan()});}catch(e){res({ok:false,error:e.message});}
  return false;
});
} // end guard
