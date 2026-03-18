// render-analytics.js v5 — Security, CWV, Health, Performance
'use strict';
window.RenderAnalytics = {

  getSecScore(h){return['strict-transport-security','content-security-policy','x-frame-options','x-content-type-options','referrer-policy','permissions-policy'].filter(k=>!!h?.[k]).length;},

  calcHealth(seo,chain,secScore){
    const seoS=seo?window.RenderSEO.calcScore(seo):50;
    const secS=Math.round((secScore/6)*100);
    const hops=chain.length,tot=chain.reduce((s,h)=>s+(h.timing||0),0);
    let redS=100;if(hops>4)redS-=50;else if(hops>2)redS-=25;else if(hops>1)redS-=10;if(tot>2000)redS-=30;else if(tot>800)redS-=15;redS=Math.max(0,redS);
    const lcp=seo?.vitals?.lcp;let perfS=80;if(lcp){perfS=lcp<2500?100:lcp<4000?60:25;}
    const total=Math.round(seoS*0.4+secS*0.25+redS*0.2+perfS*0.15);
    const grade=total>=90?'A+':total>=80?'A':total>=70?'B':total>=55?'C':total>=40?'D':'F';
    return{total,grade,seoS,secS,redS,perfS};
  },

  renderHealth(seo,chain,secScore,id){
    const el=document.getElementById(id);if(!el)return;
    const hs=this.calcHealth(seo,chain,secScore);
    const col=hs.total>=80?'#16A34A':hs.total>=55?'#D97706':'#DC2626';
    const circ=2*Math.PI*44,off=circ-(hs.total/100)*circ;
    el.innerHTML=`<div class="health-hero">
      <div class="health-ring">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="44" fill="none" stroke="var(--bdr)" stroke-width="10"/>
          <circle cx="55" cy="55" r="44" fill="none" stroke="${col}" stroke-width="10"
            stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
            stroke-linecap="round" transform="rotate(-90 55 55)" style="transition:stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)"/>
        </svg>
        <div class="health-ring-inner"><span class="health-num" style="color:${col}">${hs.total}</span><span class="health-grade" style="color:${col}">${hs.grade}</span></div>
      </div>
      <div class="health-breakdown">
        ${this._hbr('SEO Score',hs.seoS,40)}${this._hbr('Security',hs.secS,25)}
        ${this._hbr('Redirects',hs.redS,20)}${this._hbr('Performance',hs.perfS,15)}
      </div>
    </div>`;
  },
  _hbr(lbl,score,w){
    const col=score>=80?'#16A34A':score>=50?'#D97706':'#DC2626';
    return`<div class="hb-row"><span class="hb-label">${lbl} <span class="hb-weight">${w}%</span></span><div class="hb-track"><div class="hb-bar" style="width:${score}%;background:${col}"></div></div><span class="hb-val" style="color:${col}">${score}</span></div>`;
  },

  renderCWV(vitals,id){
    const el=document.getElementById(id);if(!el)return;
    const metrics=[
      {key:'lcp',label:'LCP',name:'Largest Contentful Paint',unit:'ms',good:2500,poor:4000},
      {key:'fid',label:'FID',name:'First Input Delay',unit:'ms',good:100,poor:300},
      {key:'cls',label:'CLS',name:'Cumulative Layout Shift',unit:'',good:0.1,poor:0.25,isFloat:true},
      {key:'fcp',label:'FCP',name:'First Contentful Paint',unit:'ms',good:1800,poor:3000},
      {key:'ttfb',label:'TTFB',name:'Time to First Byte',unit:'ms',good:800,poor:1800},
    ];
    el.innerHTML=metrics.map(m=>{
      const raw=vitals?.[m.key],val=raw??null;
      let status='unknown',col='var(--t4)',label='—';
      if(val!==null){label=m.isFloat?val.toFixed(3):val+m.unit;status=val<=m.good?'good':val<=m.poor?'needs-improvement':'poor';col=status==='good'?'#16A34A':status==='needs-improvement'?'#D97706':'#DC2626';}
      const bar=val!==null?Math.min((val/m.poor)*100,100).toFixed(1):0;
      return`<div class="cwv-card"><div class="cwv-label">${m.label}</div><div class="cwv-val" style="color:${col}">${label}</div><div class="cwv-name">${m.name}</div><div class="cwv-bar-wrap"><div class="cwv-bar" style="width:${bar}%;background:${col}"></div><div class="cwv-bar-good" style="left:${((m.good/m.poor)*100).toFixed(1)}%"></div></div><div class="cwv-status ${status}">${status==='unknown'?'Waiting…':status==='good'?'Good':status==='needs-improvement'?'Needs Work':'Poor'}</div></div>`;
    }).join('');
  },

  renderSecurity(chain,heroId,rowsId){
    const fin=chain.find(h=>h.statusCode===200)||chain[chain.length-1]||{};
    const h=fin.headers||{};
    const score=this.getSecScore(h);
    const col=score>=5?'#16A34A':score>=3?'#D97706':'#DC2626';
    const grade=score>=5?'A':score>=4?'B':score>=2?'C':'F';
    const hEl=document.getElementById(heroId);
    if(hEl)hEl.innerHTML=`<div class="sec-hero-wrap">
      <div style="text-align:center">
        <div class="sec-score-big" style="color:${col}">${score}<span class="sec-of">/6</span></div>
        <div class="sec-grade" style="color:${col}">Grade ${grade}</div>
      </div>
      <div class="sec-mini-grid">
        ${['HSTS','CSP','X-Frame','X-CTO','Ref-Policy','Perms'].map((n,i)=>{
          const keys=['strict-transport-security','content-security-policy','x-frame-options','x-content-type-options','referrer-policy','permissions-policy'];
          const ok=!!h[keys[i]];
          return`<div class="sm-tick ${ok?'ok':'bad'}"><span>${ok?'✓':'✗'}</span>${n}</div>`;
        }).join('')}
      </div>
    </div>`;
    const rEl=document.getElementById(rowsId);
    if(rEl){
      const checks=[
        {name:'Strict-Transport-Security',k:'strict-transport-security',desc:'Enforces HTTPS connections. Critical for all HTTPS sites.',tip:'Add: max-age=31536000; includeSubDomains'},
        {name:'Content-Security-Policy',k:'content-security-policy',desc:'Restricts resources the browser can load. Prevents XSS attacks.',tip:'Implement a CSP policy. Start with: default-src \'self\''},
        {name:'X-Frame-Options',k:'x-frame-options',desc:'Prevents clickjacking by blocking iframe embedding.',tip:'Add: X-Frame-Options: SAMEORIGIN'},
        {name:'X-Content-Type-Options',k:'x-content-type-options',desc:'Prevents MIME type sniffing attacks.',tip:'Add: X-Content-Type-Options: nosniff'},
        {name:'Referrer-Policy',k:'referrer-policy',desc:'Controls referrer info sent with requests.',tip:'Add: Referrer-Policy: strict-origin-when-cross-origin'},
        {name:'Permissions-Policy',k:'permissions-policy',desc:'Controls browser API access (camera, mic, geolocation).',tip:'Add: Permissions-Policy: camera=(), microphone=()'},
      ];
      rEl.innerHTML=checks.map(c=>{const v=h[c.k]||null;const ok=!!v;return`<div class="sec-row"><div class="sec-row-ic ${ok?'ok':'bad'}">${ok?'🛡':'⚠'}</div><div class="sec-row-cnt"><div class="sec-row-title">${E(c.name)}</div>${v?`<div class="sec-row-val">${E(v)}</div>`:`<div class="sec-row-tip">💡 ${E(c.tip)}</div>`}<div class="sec-row-desc">${E(c.desc)}</div><div class="sec-row-st ${ok?'ok':'bad'}">${ok?'✓ Present':'✗ Missing'}</div></div></div>`;}).join('');
    }
    return score;
  },

  renderPerf(seo,chain,id){
    const el=document.getElementById(id);if(!el)return;
    const fin=chain.find(h=>h.statusCode===200)||chain[chain.length-1]||{};
    const hdrs=fin.headers||{};
    const tot=chain.reduce((s,h)=>s+(h.timing||0),0);
    const roh=chain.slice(0,-1).reduce((s,h)=>s+(h.timing||0),0);
    const ttfb=seo?.vitals?.ttfb;
    const res=seo?.resources||{};
    const htmlKb=seo?.htmlSize?(seo.htmlSize/1024).toFixed(1)+' KB':'—';
    const transferKb=res.totalBytes?(res.totalBytes/1024).toFixed(1)+' KB':'—';
    const http2=hdrs['x-firefox-spdy']==='h2'||hdrs['x-protocol']==='h2';
    el.innerHTML=`
      <div class="perf-grid">
        ${C('Total Chain',tot+'ms',tot>2000?'err':tot>600?'warn':'ok',`${chain.length} hop${chain.length!==1?'s':''}`)}
        ${C('Redirect Overhead',roh+'ms',roh>500?'err':roh>200?'warn':'ok',`${chain.length-1} redirect${chain.length-1!==1?'s':''}`)}
        ${C('TTFB',ttfb!=null?ttfb+'ms':'—',ttfb!=null?(ttfb<800?'ok':ttfb<1800?'warn':'err'):'','Time to first byte')}
        ${C('HTML Size',htmlKb,'info','Page HTML weight')}
        ${C('Cache',hdrs['cache-control']||'Not set',hdrs['cache-control']?'ok':'warn','cache-control',true)}
        ${C('Word Count',seo?.wordCount||0,(seo?.wordCount||0)>300?'ok':(seo?.wordCount||0)>100?'warn':'err','Content words')}
      </div>
      ${(seo?.technologies?.length)?`<div class="tech-stack"><div class="tech-label">Detected Technologies</div><div class="tech-tags">${seo.technologies.map(t=>`<span class="tech-tag">${E(t.icon)} ${E(t.name)}</span>`).join('')}</div></div>`:''}
      <div class="res-counts" style="margin-top:10px">
        ${RC('JS Files',res.js||0)}<${RC('CSS Files',res.css||0)}<${RC('Images',res.img||0)}<${RC('Fonts',res.font||0)}<${RC('XHR/Fetch',res.xhr||0)}<${RC('Transfer',transferKb)}
      </div>
      <div class="hints-section"><div class="hints-lbl">Resource Hints <span class="h-cnt">${(seo?.resourceHints||[]).length}</span></div>${(seo?.resourceHints||[]).length?(seo.resourceHints||[]).map(h=>`<div class="hint-row"><span class="hint-rel">${E(h.rel)}</span>${h.as?`<span class="hint-as">${E(h.as)}</span>`:''}<span class="hint-href">${E(h.href||'')}</span></div>`).join(''):'<div style="font-size:11px;color:var(--t4);font-style:italic">No resource hints found</div>'}</div>
      <div class="img-audit"><div class="hints-lbl">Image Audit</div>
        <div class="ia-row"><span>Total Images</span><span>${seo?.imgCount||0}</span></div>
        <div class="ia-row"><span>Missing Alt Text</span><span class="${(seo?.noAltImgs||0)>0?'val-warn':'val-ok'}">${seo?.noAltImgs||0}</span></div>
        <div class="ia-row"><span>Lazy Loaded</span><span class="${(seo?.lazyImgs||0)>0?'val-ok':''}">${seo?.lazyImgs||0}</span></div>
        <div class="ia-row"><span>WebP/AVIF</span><span class="${(seo?.webpImgs||0)>0?'val-ok':''}">${seo?.webpImgs||0}</span></div>
      </div>`;
  }
};
function C(lbl,val,cls,sub,sm=false){return`<div class="pg-card"><div class="pg-label">${lbl}</div><div class="pg-val ${cls}" style="${sm?'font-size:11px':''}">${E(String(val))}</div><div class="pg-sub">${E(sub)}</div></div>`;}
function RC(k,v){return`<div class="rc-item"><div class="rc-val">${E(String(v))}</div><div class="rc-k">${k}</div></div>`;}
function E(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
