// render-seo.js v5 — SEO, Insights, Social, Robots, Sitemap, Headings, Keywords
'use strict';
window.RenderSEO = {

  calcScore(seo){
    if(!seo)return 0;
    return Math.min(100,[
      [!!seo.title,15],[seo.title?.length>=10&&seo.title?.length<=60,5],[!!seo.description,12],
      [seo.description?.length>=50&&seo.description?.length<=160,5],[!!seo.canonical,8],[!seo.isNoindex,20],
      [seo.h1s?.length===1,10],[!!seo.ogImage,5],[!!seo.viewport,4],[!seo.metaRefresh,5],
      [!!seo.ogTitle,4],[seo.wordCount>300,4],[!!seo.lang,4],[seo.noAltImgs===0||seo.imgCount===0,3],
      [!seo.canonicalMismatch,4]
    ].reduce((s,[p,w])=>s+(p?w:0),0));
  },

  renderHero(seo,chain,id){
    const el=document.getElementById(id);if(!el)return;
    if(!seo){el.innerHTML=`<div class="unavail-box"><span>⚠</span><div><strong>SEO data unavailable</strong><br>Navigate to a regular website and click Refresh.</div></div>`;return;}
    const score=this.calcScore(seo);
    const col=score>=80?'#16A34A':score>=50?'#D97706':'#DC2626';
    const grade=score>=90?'A+':score>=80?'A':score>=70?'B':score>=50?'C':score>=40?'D':'F';
    const circ=2*Math.PI*32,off=circ-(score/100)*circ;
    let cf='';
    if(seo.canonicalMismatch)cf='<span class="sp err">⚠ Canonical Conflict</span>';
    else if(seo.canonical&&chain.length>1){const fu=chain[chain.length-1]?.url||'';try{if(new URL(seo.canonical).href!==new URL(fu).href)cf='<span class="sp warn">⚠ Canonical ≠ Final URL</span>';}catch{}}
    el.innerHTML=`<div class="seo-hero">
      <div class="score-donut">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bdr)" stroke-width="8"/>
          <circle cx="40" cy="40" r="32" fill="none" stroke="${col}" stroke-width="8"
            stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
            stroke-linecap="round" transform="rotate(-90 40 40)"
            style="transition:stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)"/>
        </svg>
        <div class="score-donut-inner"><span class="score-num" style="color:${col}">${score}</span><span class="score-grade" style="color:${col}">${grade}</span></div>
      </div>
      <div class="seo-hero-meta">
        <div class="seo-hero-title">${E(seo.title||'(no title)')}</div>
        <div class="seo-hero-url">${E(seo.url)}</div>
        <div class="seo-hero-pills">
          ${P(seo.isIndexable?'ok':'err',seo.isIndexable?'✓ Indexed':'✗ Noindex')}
          ${P(seo.canonical?'ok':'warn',seo.canonical?'✓ Canonical':'⚠ No Canonical')}
          ${P(seo.h1s?.length===1?'ok':seo.h1s?.length===0?'err':'warn',(seo.h1s?.length||0)+' H1')}
          ${seo.metaRefresh?P('warn','⚠ Meta Refresh'):''}
          ${seo.ogImage?P('info','✓ OG Image'):''}
          ${seo.schemas?.length?P('info','✓ Schema'):''}
          ${seo.viewport?P('ok','✓ Mobile'):''}
          ${seo.lang?P('ok','✓ lang'):''}
          ${cf}
        </div>
      </div>
    </div>`;
  },

  renderAudit(seo,id){
    const el=document.getElementById(id);if(!el)return;
    if(!seo){el.innerHTML='';return;}
    const rows=[
      {ico:'📄',k:'Title',v:seo.title||'(not set)',s:seo.title?(seo.title.length>60?'warn':'ok'):'err',note:seo.title?.length>60?`Too long (${seo.title.length}/60)`:(seo.title?.length<10?'Too short':null)},
      {ico:'📝',k:'Description',v:seo.description||'(not set)',s:seo.description?(seo.description.length>160?'warn':'ok'):'warn',note:seo.description?.length>160?`Too long (${seo.description.length}/160)`:null},
      {ico:'🔎',k:'Indexable',v:seo.isIndexable?'✓ Yes — Indexable':'✗ Noindex active',s:seo.isIndexable?'ok':'err'},
      {ico:'🔗',k:'Canonical',v:seo.canonical||'(not set)',s:seo.canonical?'info':'warn'},
      {ico:'🤖',k:'Meta Robots',v:seo.robots||'(not set)',s:seo.robots?'ok':'muted'},
      {ico:'H1',k:'H1 Tag',v:seo.h1s?.[0]?`"${seo.h1s[0].substring(0,80)}"`:seo.h1s?.length>1?`${seo.h1s.length} H1s found`:'(none)',s:seo.h1s?.length===1?'ok':seo.h1s?.length===0?'err':'warn',note:seo.h1s?.length>1?`Multiple H1s — use only one`:null},
      {ico:'H2',k:'H2 Count',v:String(seo.h2Count||0),s:''},
      {ico:'🔄',k:'Meta Refresh',v:seo.metaRefresh?'⚠ '+seo.metaRefresh:'✓ None',s:seo.metaRefresh?'warn':'ok'},
      {ico:'🌍',k:'Language',v:seo.lang||'(not set)',s:seo.lang?'ok':'warn'},
      {ico:'📱',k:'Viewport',v:seo.viewport||'(not set)',s:seo.viewport?'ok':'warn'},
      {ico:'💬',k:'Word Count',v:`${seo.wordCount||0} words`,s:(seo.wordCount||0)>300?'ok':(seo.wordCount||0)>100?'warn':'err'},
      {ico:'🖼',k:'Images',v:`${seo.imgCount||0} total, ${seo.noAltImgs||0} missing alt`,s:(seo.noAltImgs||0)>0?'warn':'ok'},
      {ico:'🔤',k:'Charset',v:seo.charset||'—',s:seo.charset?'ok':'muted'},
      {ico:'🔑',k:'Keywords',v:seo.keywordsTag?seo.keywordsTag.substring(0,55):'(not set)',s:seo.keywordsTag?'ok':'muted'},
      {ico:'🎨',k:'Theme Color',v:seo.themeColor||'(not set)',s:seo.themeColor?'ok':'muted'},
      {ico:'🌐',k:'hreflang',v:seo.hreflang?.length?`${seo.hreflang.length} entries`:'Not set',s:seo.hreflang?.length?'ok':'muted'},
      {ico:'📄',k:'Pagination',v:seo.pagination?.prev||seo.pagination?.next?`rel prev/next set`:'Not set',s:seo.pagination?.prev||seo.pagination?.next?'ok':'muted'},
    ];
    document.getElementById('seoCount')&&(document.getElementById('seoCount').textContent=rows.length+' checks');
    el.innerHTML=rows.map(r=>`<div class="sau-row"><div class="sau-l"><span class="sau-ico">${r.ico}</span><span class="sau-lbl">${E(r.k)}</span></div><div class="sau-r"><span class="sau-v ${r.s||''}">${E(String(r.v))}</span>${r.note?`<span class="sau-note">${E(r.note)}</span>`:''}</div></div>`).join('');
  },

  generateInsights(seo,chain){
    const ins=[]; const add=(lv,ic,t,d)=>ins.push({level:lv,icon:ic,title:t,desc:d});
    if(!seo){add('warn','⚠','SEO data unavailable','Content script could not access this page.');return ins;}
    const tot=chain.reduce((s,h)=>s+(h.timing||0),0);
    if(chain.some(h=>h.loopDetected))add('error','∞','Redirect loop detected','This page has a circular redirect. It will never load properly and is invisible to search engines.');
    if(chain.length>3)add('error','🔴',`${chain.length} redirects — critical`,'More than 3 redirects severely impacts Core Web Vitals and crawl budget. Consolidate to a single redirect.');
    else if(chain.length>1)add('warn','🟡',`${chain.length-1} redirect hop${chain.length>2?'s':''}`,`Redirects add latency. ${chain.length>2?'Multiple redirects compound the slowdown. ':''}Consider updating links to point directly to the final URL.`);
    if(tot>2000)add('error','⏱',`Total time ${tot}ms — exceeds 2s`,'Slow redirect chain directly impacts LCP. Each hop adds network round-trip time.');
    const hasHttp=chain.some(h=>h.url.startsWith('http://'));
    if(hasHttp&&chain[chain.length-1]?.url.startsWith('https://'))add('warn','🔒','HTTP→HTTPS redirect active','Update links to use HTTPS directly to save one redirect hop and improve performance.');
    if(!seo.title)add('error','📄','Missing <title> tag','Critical: No page title. This is the most important on-page SEO signal. Add a descriptive 30-60 char title immediately.');
    else if(seo.title.length>60)add('warn','📄',`Title too long (${seo.title.length} chars)`,'Google truncates titles over ~60 characters in SERPs. Shorten to 50-60 chars for best display.');
    else if(seo.title.length<10)add('warn','📄','Title too short','A title under 10 characters is too vague. Use 30-60 descriptive characters.');
    if(!seo.description)add('warn','📝','Missing meta description','Without a description, Google auto-generates snippets which may not represent your page well. Write 120-155 chars.');
    else if(seo.description.length>160)add('warn','📝',`Description truncated (${seo.description.length} chars)`,'Meta descriptions over 160 chars get cut off in search results. Rewrite to 120-155 characters.');
    if(!seo.canonical)add('warn','🔗','No canonical URL specified','Add <link rel="canonical"> to prevent duplicate content issues and consolidate link signals.');
    if(seo.canonicalMismatch)add('error','🔗','Canonical URL conflict','The canonical points to a different domain. This is a critical SEO misconfiguration that can cause de-indexing.');
    if(seo.isNoindex)add('error','🚫','Page set to Noindex','This page will NOT appear in search results. Remove noindex directive if this page should be indexed.');
    if(seo.metaRefresh)add('error','🔄','Meta refresh redirect','Meta refresh is an outdated, SEO-hostile redirect method. Replace with a proper 301 server-side redirect.');
    if(!seo.h1s?.length)add('error','H1','No H1 tag found','Every page needs exactly one H1. It signals the main topic to search engines. Add one now.');
    else if(seo.h1s.length>1)add('warn','H1',`${seo.h1s.length} H1 tags found`,'Use exactly ONE H1 per page. Multiple H1s dilute the primary heading signal and confuse search engines.');
    if((seo.wordCount||0)<100)add('warn','💬','Very thin content','Under 100 words is considered thin content. Google may downrank or exclude very short pages from results.');
    if((seo.noAltImgs||0)>0)add('warn','🖼',`${seo.noAltImgs} image${seo.noAltImgs>1?'s':''} missing alt text`,'Alt text is essential for image SEO and accessibility. Add descriptive alt attributes to all images.');
    if(!seo.viewport)add('warn','📱','No viewport meta tag','Missing viewport tag breaks mobile rendering. This significantly hurts mobile SEO rankings.');
    if(!seo.lang)add('warn','🌍','No lang attribute on <html>','Specifying page language helps search engines serve content to the right audience. Add: <html lang="en">');
    if(seo.mixedContent?.hasMixedContent)add('warn','⚠',`Mixed content: ${seo.mixedContent.issues.length} HTTP resource${seo.mixedContent.issues.length>1?'s':''} on HTTPS page`,'Mixed content triggers browser security warnings and can cause resources to be blocked. Move all assets to HTTPS.');
    if(!seo.schemas?.length)add('info','📋','No structured data (JSON-LD)','Adding Schema.org markup can unlock rich snippets in Google (stars, FAQs, breadcrumbs). High-value for CTR.');
    if(!seo.ogImage)add('info','🖼','No Open Graph image','Social media shares will show no image. Add og:image for better click rates on Facebook and LinkedIn.');
    if(!seo.viewport)add('warn','📱','No mobile viewport','Without a viewport meta tag, the page may not render correctly on mobile devices.');
    return ins.slice(0,18);
  },

  renderInsights(seo,chain,id){
    const el=document.getElementById(id);if(!el)return;
    const ins=this.generateInsights(seo,chain);
    const pEl=document.getElementById('insPill');if(pEl)pEl.textContent=ins.length+' signals';
    if(!ins.length){el.innerHTML='<div class="empty-info empty-ok">✓ No significant issues detected!</div>';return;}
    el.innerHTML=ins.map(i=>`<div class="insight-item ${i.level}"><div class="ins-ico">${i.icon}</div><div class="ins-body"><div class="ins-title">${E(i.title)}</div><div class="ins-desc">${E(i.desc)}</div></div><div class="ins-badge ${i.level}">${i.level.toUpperCase()}</div></div>`).join('');
  },

  renderHeadingTree(seo,id){
    const el=document.getElementById(id);if(!el)return;
    const tree=seo?.headingTree||[];
    if(!tree.length){el.innerHTML='<div class="empty-info">No headings found</div>';return;}
    el.innerHTML=tree.map(h=>{
      const indent=Math.max(0,h.level-1)*16;
      return `<div class="h-node" style="padding-left:${indent+8}px">
        ${h.level>1?`<div class="h-node-indent" style="width:${(h.level-1)*12}px"></div>`:''}
        <span class="h-node-level h${h.level}">H${h.level}</span>
        <span class="h-node-text">${E(h.text)}</span>
      </div>`;
    }).join('');
  },

  renderKeywords(seo,id){
    const el=document.getElementById(id);if(!el)return;
    const kws=seo?.keywords||[];
    if(!kws.length){el.innerHTML='<div class="empty-info">No keyword data</div>';return;}
    const max=kws[0]?.count||1;
    el.innerHTML=kws.map(k=>`<div class="kw-row">
      <span class="kw-word">${E(k.word)}</span>
      <div class="kw-bar-wrap"><div class="kw-bar" style="width:${Math.round((k.count/max)*100)}%"></div></div>
      <span class="kw-count">${k.count}×</span>
      <span class="kw-density">${k.density}%</span>
    </div>`).join('');
  },

  renderMixedContent(seo,id){
    const el=document.getElementById(id);if(!el)return;
    const mc=seo?.mixedContent;
    if(!mc||!mc.isHttps){el.innerHTML='<div class="empty-info">Page is served over HTTP — mixed content check not applicable</div>';return;}
    if(!mc.hasMixedContent){el.innerHTML='<div class="mc-clean">✓ No mixed content detected — all resources are served over HTTPS</div>';return;}
    el.innerHTML=`<div style="padding:8px 14px;font-size:11px;font-weight:700;color:var(--red);background:var(--red-lt);border-bottom:1px solid var(--red-mid)">⚠ ${mc.issues.length} mixed content issue${mc.issues.length>1?'s':''} found</div>`+
      mc.issues.map(i=>`<div class="mc-item"><span class="mc-type">${E(i.type)}</span><span class="mc-url">${E(i.url)}</span></div>`).join('');
  },

  renderHreflang(seo,id){
    const el=document.getElementById(id);if(!el)return;
    const hl=seo?.hreflang||[];
    if(!hl.length){el.innerHTML='<div class="empty-info">No hreflang tags found — add them for international SEO</div>';return;}
    el.innerHTML=hl.map(h=>`<div class="hl-row"><span class="hl-lang">${E(h.hreflang)}</span><span class="hl-href">${E(h.href)}</span></div>`).join('');
  },

  renderSchema(seo,id,pillId){
    const el=document.getElementById(id),pi=document.getElementById(pillId);
    if(!el)return;
    const s=seo?.schemas||[];
    if(pi)pi.textContent=s.length+' types';
    el.innerHTML=s.length?s.map(x=>`<span class="schema-tag">📋 ${E(x)}</span>`).join(''):'<div class="empty-info">No JSON-LD structured data found</div>';
  },

  renderSocial(seo,tabUrl,id){
    const el=document.getElementById(id);if(!el)return;
    let host='';try{host=new URL(tabUrl||'').hostname;}catch{}
    el.innerHTML=`
      <div class="preview-label">Google SERP Preview</div>
      <div class="google-prev" style="margin-bottom:12px">
        <div class="gp-url">${E((tabUrl||'').substring(0,70))}</div>
        <div class="gp-title" style="color:${(seo?.title?.length||0)>60?'#D97706':'#1a0dab'}">${E(seo?.title||'(No title — Google will generate one)')}</div>
        <div class="gp-desc">${E(seo?.description||'(No meta description — Google will use page content as snippet)')}</div>
        ${(seo?.title?.length||0)>60?`<div class="gp-warn">⚠ Title truncated (${seo.title.length}/60 chars)</div>`:''}
        ${(seo?.description?.length||0)>160?`<div class="gp-warn">⚠ Description truncated (${seo.description.length}/160 chars)</div>`:''}
      </div>
      <div class="preview-label">Open Graph (Facebook / LinkedIn)</div>
      <div class="og-card" style="margin-bottom:12px">
        <div class="og-img">${seo?.ogImage?`<img src="${E(seo.ogImage)}" class="og-img-tag" alt="">`:'<span style="color:var(--t4);font-size:12px">No og:image set</span>'}</div>
        <div class="og-body"><div class="og-site">${E(seo?.ogSiteName||host)}</div><div class="og-title">${E(seo?.ogTitle||seo?.title||'(No OG title)')}</div><div class="og-desc">${E(seo?.ogDesc||seo?.description||'(No OG description)')}</div></div>
      </div>
      <div class="preview-label">Twitter / X Card</div>
      <div class="tw-card">
        ${seo?.ogImage?`<div class="tw-img"><img src="${E(seo.ogImage)}" class="tw-img-tag" alt=""></div>`:''}
        <div class="tw-body"><div class="tw-site">${E(host)}</div><div class="tw-title">${E(seo?.twTitle||seo?.ogTitle||seo?.title||'(No title)')}</div><div class="tw-desc">${E(seo?.twDesc||seo?.ogDesc||seo?.description||'(No description)')}</div></div>
      </div>
      ${!seo?.twCard?'<div class="gp-warn" style="margin-top:6px">⚠ No twitter:card meta tag — Twitter may not show a card preview</div>':''}`;
  },

  renderRobots(data,id){
    const el=document.getElementById(id);if(!el)return;
    if(!data||!data.ok){el.innerHTML=`<div class="unavail-box"><span>⚠</span><div>${E(data?.error||'Failed to fetch robots.txt')}</div></div>`;return;}
    const p=data.parsed||{};const da=p.agents?.['*']||{allow:[],disallow:[]},sm=p.sitemaps||[];
    el.innerHTML=`<div class="robots-meta"><span class="r-badge ${data.statusCode===200?'ok':'err'}">${data.statusCode||'?'}</span><span class="r-url">${E(data.url||'')}</span><span class="r-timing">${data.timing||0}ms</span></div>
    <div style="padding:10px 14px;display:flex;flex-direction:column;gap:10px">
      <div class="rb-section"><div class="rb-title">Disallowed (User-agent: *)</div>${da.disallow&&da.disallow.length?da.disallow.slice(0,20).map(x=>`<div class="rb-path disallow">✗ ${E(x)}</div>`).join(''):'<div class="rb-empty">No disallowed paths</div>'}</div>
      <div class="rb-section"><div class="rb-title">Allowed</div>${da.allow&&da.allow.length?da.allow.slice(0,10).map(x=>`<div class="rb-path allow">✓ ${E(x)}</div>`).join(''):'<div class="rb-empty">No explicit allow rules</div>'}</div>
      ${sm&&sm.length?`<div class="rb-section"><div class="rb-title">Sitemaps Declared</div>${sm.map(s=>`<div class="rb-path sitemap">🗺 <a href="${E(s)}" target="_blank" rel="noopener">${E(s)}</a></div>`).join('')}</div>`:''}
      ${p.crawlDelay&&Object.keys(p.crawlDelay||{}).length?`<div class="rb-section"><div class="rb-title">Crawl Delay</div>${Object.entries(p.crawlDelay).map(([a,d])=>`<div class="rb-path plain">🕐 ${E(a)}: ${d}s</div>`).join('')}</div>`:''}
    </div>
    <details class="robots-raw"><summary>View raw robots.txt (${(data.raw||'').length} chars)</summary><pre class="robots-pre">${E(data.raw||'')}</pre></details>`;
  },

  renderSitemap(data,id){
    const el=document.getElementById(id);if(!el)return;
    if(!data||!data.ok){el.innerHTML=`<div class="unavail-box"><span>⚠</span><div>${E(data?.error||'Failed to fetch sitemap.xml')}</div></div>`;return;}
    const p=data.parsed||{};
    if(p.type==='index'){
      const sms=p.sitemaps||[];
      el.innerHTML=`<div class="sitemap-meta">✓ Sitemap Index <span style="font-size:10px;font-weight:500;color:var(--t2)">${p.count||0} sub-sitemaps</span><span class="r-timing">${data.timing||0}ms</span></div>${sms.map(s=>`<div class="sm-item"><div class="sm-url"><a href="${E(s)}" target="_blank" rel="noopener">🗺 ${E(s)}</a></div></div>`).join('')}`;
    } else {
      const items=p.items||[];
      el.innerHTML=`<div class="sitemap-meta">✓ URL Sitemap <span style="font-size:10px;font-weight:500;color:var(--t2)">${p.count||0} total URLs</span><span class="r-timing">${data.timing||0}ms</span></div>${items.slice(0,25).map(i=>`<div class="sm-item"><div class="sm-url">${E(i.loc||'')}</div><div class="sm-meta">${i.lastmod?'📅 '+i.lastmod:''} ${i.priority?'· P:'+i.priority:''} ${i.changefreq?'· '+i.changefreq:''}</div></div>`).join('')}${(p.count||0)>25?`<div class="sm-more">+${(p.count||0)-25} more URLs in sitemap</div>`:''}`;
    }
  }
};
function P(cls,t){return`<span class="sp ${cls}">${E(t)}</span>`;}
function E(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
