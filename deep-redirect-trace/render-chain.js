// render-chain.js v5
'use strict';
window.RenderChain = {
  renderFlow(chain, id, loopInfo) {
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML='';
    if(!chain.length){el.innerHTML='<div class="empty-info">No redirect data</div>';return;}
    if(loopInfo?.detected){
      const la=document.createElement('div');la.className='loop-alert';
      la.innerHTML=`<span>∞</span> <strong>Redirect Loop Detected!</strong> URL <code style="font-family:var(--mono);font-size:10px">${E(loopInfo.url)}</code> appears multiple times in the chain.`;
      el.parentElement.insertBefore(la,el);
    }
    chain.forEach((hop,i)=>{
      const sc=hop.statusCode||0, c='c'+sc;
      let dom='',path='',proto='';
      try{const u=new URL(hop.url);dom=u.hostname;path=u.pathname+(u.search?'?…':'');proto=u.protocol.replace(':','');}catch{dom=hop.url.substring(0,35);}
      let changeTag='';
      if(i>0){try{const pU=new URL(chain[i-1].url),cU=new URL(hop.url);
        if(pU.protocol!==cU.protocol)changeTag='<span class="fn-change proto">🔒 HTTPS</span>';
        else if(pU.hostname!==cU.hostname)changeTag='<span class="fn-change domain">🌐 Domain</span>';
        else if(pU.pathname!==cU.pathname)changeTag='<span class="fn-change path">📁 Path</span>';
      }catch{}}
      const isFinal=i===chain.length-1;
      const nd=document.createElement('div');nd.className='fn';nd.dataset.hop=i;
      nd.innerHTML=`<div class="fn-card ${c}" title="${E(hop.url)}">
        <div class="fn-card-top"><div class="fn-num ${c}">${i+1}</div><span class="fn-proto ${c}">${E(proto.toUpperCase())}</span></div>
        <div class="fn-domain">${E(dom)}</div>
        <div class="fn-path">${E(path||'/')}</div>
        <div class="fn-foot"><span class="sbadge s${sc}">${sc||'?'}</span><span class="fn-ms">${hop.timing||0}ms</span></div>
        ${changeTag}
      </div>`;
      el.appendChild(nd);
      if(!isFinal){const ar=document.createElement('div');ar.className='fn-arrow';
        ar.innerHTML=`<div class="fn-arr-line ${c}"></div><div class="fn-arr-tip ${c}">▶</div><div class="fn-arr-label">${SLBL(sc)}</div>`;
        el.appendChild(ar);}
    });
    el.querySelectorAll('.fn-card').forEach(card=>{
      card.addEventListener('click',()=>{const i=parseInt(card.closest('.fn').dataset.hop);if(window.PopupApp)window.PopupApp.goToHeaders(i);});
    });
  },

  renderHopCards(chain,id){
    const el=document.getElementById(id);if(!el)return;el.innerHTML='';
    chain.forEach((hop,i)=>{
      const sc=hop.statusCode||0,c='c'+sc,h=hop.headers||{},hArr=Object.entries(h);
      const isFinal=i===chain.length-1;
      const tags=[];
      if(h.server)tags.push({k:'Server',v:h.server});
      if(h['content-type'])tags.push({k:'Type',v:h['content-type'].split(';')[0]});
      if(h['cache-control'])tags.push({k:'Cache',v:h['cache-control'].substring(0,28)});
      if(h['location'])tags.push({k:'→ Location',v:h['location'].substring(0,50)});
      if(h['x-robots-tag'])tags.push({k:'X-Robots',v:h['x-robots-tag']});
      if(h['content-encoding'])tags.push({k:'Encoding',v:h['content-encoding']});
      if(hop.error)tags.push({k:'Error',v:hop.error});
      // HTTP version detection
      const http2=h['x-firefox-spdy']==='h2'||h[':status']!==undefined;
      const card=document.createElement('div');card.className='hc';card.style.animationDelay=(i*70)+'ms';
      card.innerHTML=`<div class="hc-head">
        <div class="hc-n ${c}">${i+1}</div>
        <div class="hc-info">
          <div class="hc-label">
            <span class="sbadge s${sc}">${sc}</span>
            <span class="hc-sc-text">${FLBL(sc)}</span>
            ${isFinal?'<span class="hc-final-tag">✓ Final</span>':''}
            ${hop.loopDetected?'<span class="hc-final-tag" style="background:var(--purple-lt);color:var(--purple);border-color:var(--purple-mid)">∞ Loop</span>':''}
          </div>
          <div class="hc-url" title="${E(hop.url)}">${E(hop.url)}</div>
        </div>
        <div class="hc-right">
          <span class="hc-ms">${hop.timing||0}ms</span>
          ${hArr.length?`<span class="hc-toggle-btn">▾ ${hArr.length} hdrs</span>`:''}
        </div>
      </div>
      ${(tags.length||hArr.length)?`<div class="hc-body" id="hcb-${i}">
        ${tags.length?`<div class="hc-tags-row">${tags.map(t=>`<span class="hc-tag"><span class="hc-tag-k">${E(t.k)}</span><span class="hc-tag-v">${E(t.v)}</span></span>`).join('')}</div>`:''}
        ${hArr.length?`<div class="hc-hdrs">${hArr.map(([k,v])=>`<div class="hdr-row"><span class="hdr-k">${E(k)}</span><span class="hdr-v">${E(v)}</span></div>`).join('')}</div>`:''}
      </div>`:''}`;
      card.querySelector('.hc-head').addEventListener('click',()=>{
        const b=document.getElementById('hcb-'+i);if(!b)return;
        const open=b.classList.toggle('open');
        const btn=card.querySelector('.hc-toggle-btn');
        if(btn)btn.textContent=open?'▴ hide':(`▾ ${hArr.length} hdrs`);
      });
      el.appendChild(card);
    });
  },

  renderTiming(chain,gridId,totalId){
    const el=document.getElementById(gridId),tot=document.getElementById(totalId);
    if(!el)return;
    const totalMs=chain.reduce((s,h)=>s+(h.timing||0),0);
    if(tot)tot.textContent=totalMs+'ms total';
    const maxT=Math.max(...chain.map(h=>h.timing||0),1);
    el.innerHTML='';
    chain.forEach(hop=>{
      let host=hop.url;try{host=new URL(hop.url).hostname;}catch{}
      const sc=hop.statusCode||0,pct=Math.max(((hop.timing||0)/maxT)*100,3).toFixed(1);
      const row=document.createElement('div');row.className='t-row';
      row.innerHTML=`<span class="sbadge s${sc}">${sc}</span><span class="t-host" title="${E(hop.url)}">${E(host)}</span><div class="t-track"><div class="t-bar tb${sc}" style="width:${pct}%"></div></div><span class="t-ms">${hop.timing||0}ms</span>`;
      el.appendChild(row);
    });
  }
};
function SLBL(sc){return{301:'Perm',302:'Temp',303:'Other',307:'307',308:'Perm',200:'OK',0:'Err'}[sc]||String(sc);}
function FLBL(sc){return{200:'200 OK',301:'301 Moved Permanently',302:'302 Found',303:'303 See Other',307:'307 Temporary Redirect',308:'308 Permanent Redirect',404:'404 Not Found',500:'500 Server Error',0:'Network Error'}[sc]||'HTTP '+sc;}
function E(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
