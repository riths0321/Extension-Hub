// render-links.js v5
'use strict';
window.RenderLinks = {
  renderStats(seo,id){
    const el=document.getElementById(id);if(!el)return;
    el.innerHTML=`
      <div class="lsc"><div class="lsc-ico blue">${SL()}</div><div class="lsc-v">${seo?.linkCount??'—'}</div><div class="lsc-k">Total</div></div>
      <div class="lsc"><div class="lsc-ico green">${SH()}</div><div class="lsc-v green">${seo?.internalLinks??'—'}</div><div class="lsc-k">Internal</div></div>
      <div class="lsc"><div class="lsc-ico purple">${SE()}</div><div class="lsc-v purple">${seo?.externalLinks??'—'}</div><div class="lsc-k">External</div></div>
      <div class="lsc"><div class="lsc-ico amber">${SX()}</div><div class="lsc-v amber">${seo?.nofollowCount??'—'}</div><div class="lsc-k">Nofollow</div></div>
      <div class="lsc"><div class="lsc-ico cyan" style="background:var(--cyan-lt);color:var(--cyan)">SP</div><div class="lsc-v cyan" style="color:var(--cyan)">${seo?.sponsoredCount??'—'}</div><div class="lsc-k">Sponsored</div></div>
      <div class="lsc"><div class="lsc-ico red" style="background:var(--red-lt);color:var(--red)">UG</div><div class="lsc-v red" style="color:var(--red)">${seo?.ugcCount??'—'}</div><div class="lsc-k">UGC</div></div>`;
  },
  renderList(seo,filter,id,broken){
    const el=document.getElementById(id);if(!el)return;
    if(!seo){el.innerHTML='<div class="empty-info">SEO data unavailable</div>';return;}
    let list=[];
    if(filter==='nofollow')list=seo.nofollowLinks||[];
    else if(filter==='sponsored')list=seo.sponsoredLinks||[];
    else if(filter==='ugc')list=(seo.ugcLinks||[]);
    else if(filter==='external')list=(seo.allLinks||[]).filter(l=>l.isExternal);
    else if(filter==='internal')list=(seo.allLinks||[]).filter(l=>!l.isExternal);
    else if(filter==='broken')list=(broken||[]).filter(b=>b.broken).map(b=>({href:b.url,text:b.url,status:b.status,error:b.error,isBroken:true,isExternal:true}));
    else list=seo.allLinks||[];
    const shown=list.slice(0,250);
    if(!shown.length){
      const m={nofollow:'✓ No nofollow links',sponsored:'No sponsored links',ugc:'No UGC links',external:'No external links',internal:'No internal links',broken:'✓ No broken links detected',all:'No links found'};
      el.innerHTML=`<div class="empty-info ${filter==='nofollow'||filter==='broken'?'empty-ok':''}">${m[filter]||'Empty'}</div>`;return;
    }
    el.innerHTML=shown.map(l=>{
      const b=[];
      if(l.isBroken)b.push(`<span class="lb err">${l.status||'ERR'}</span>`);
      if(l.isNofollow)b.push('<span class="lb nf">Nofollow</span>');
      if(l.isSponsored)b.push('<span class="lb sp">Sponsored</span>');
      if(l.isUgc)b.push('<span class="lb ugc">UGC</span>');
      if(!l.isNofollow && !l.isSponsored && !l.isUgc && !l.isBroken)b.push('<span class="lb fol">Follow</span>');
      b.push(l.isExternal?'<span class="lb ext">External</span>':'<span class="lb int">Internal</span>');
      return `<div class="li" data-href="${E(l.href)}">
        <div class="li-badges">${b.join('')}</div>
        <div class="li-info">
          <div class="li-text">${E(l.text||'(no anchor text)')}</div>
          <div class="li-href">${E(l.href||'#')}</div>
          ${l.error?`<div class="li-error">${E(l.error)}</div>`:''}
        </div>
      </div>`;
    }).join('')+(list.length>250?`<div class="empty-info">+${list.length-250} more (export for full list)</div>`:'');
  }
};
function SL(){return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;}
function SH(){return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;}
function SE(){return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;}
function SX(){return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;}
function E(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
