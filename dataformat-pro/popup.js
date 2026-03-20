/**
 * DataFormat Pro — popup.js v3.1
 * JSON · XML · YAML · TOML · CSV · HTML
 * Chrome MV3 · CSP-safe
 */
'use strict';
document.addEventListener('DOMContentLoaded', function(){

var $=function(id){return document.getElementById(id);};

// DOM
var inputEditor   =$('inputEditor'),  outputEditor  =$('outputEditor');
var formatSelect  =$('formatSelect'), indentSelect  =$('indentSelect');
var prettifyBtn   =$('prettifyBtn'),  minifyBtn     =$('minifyBtn');
var validateBtn   =$('validateBtn'),  convertBtn    =$('convertBtn');
var convertMenu   =$('convertMenu');
var copyBtn       =$('copyBtn'),      downloadBtn   =$('downloadBtn');
var clearBtn      =$('clearBtn'),     pasteBtn      =$('pasteBtn');
var sampleBtn     =$('sampleBtn'),    darkToggle    =$('darkToggle');
var escapeBtn     =$('escapeBtn'),    uploadBtn     =$('uploadBtn');
var fileInput     =$('fileInput');
var searchToggle  =$('searchToggle'), searchBar     =$('searchBar');
var closeSearchBtn=$('closeSearchBtn'),findInput    =$('findInput');
var replaceInput  =$('replaceInput'), replaceOneBtn =$('replaceOneBtn');
var replaceAllBtn =$('replaceAllBtn'),matchCount    =$('matchCount');
var detectedBadge =$('detectedBadge'),outputBadge  =$('outputBadge');
var inputLineNums =$('inputLineNums'),outputLineNums=$('outputLineNums');
var inputStats    =$('inputStats'),   outputStats2  =$('outputStats2');
var outputStats   =$('outputStats');
var statusDot     =$('statusDot'),    statusText    =$('statusText');
var statusMsg     =$('statusMsg'),    inputError    =$('inputError');
var optSortKeys   =$('optSortKeys'),  optWordWrap   =$('optWordWrap');
var optAutoFormat =$('optAutoFormat');
var editorsEl     =document.querySelector('.editors');

// State
var curOut='', curFmt='', debT=null, stT=null, convOpen=false;

// ── Init ──────────────────────────────────────────────────────
function init(){loadSettings();bindEvents();renderGutter(inputLineNums,1);updateInputStats();}

// ── Settings ──────────────────────────────────────────────────
function loadSettings(){
  if(typeof chrome==='undefined'||!chrome.storage)return;
  chrome.storage.local.get(['darkMode','indent','format','sortKeys','wordWrap','autoFormat'],function(r){
    if(r.darkMode) document.body.classList.add('dark');
    if(r.indent)   indentSelect.value=r.indent;
    if(r.format)   formatSelect.value=r.format;
    if(r.sortKeys) optSortKeys.checked=true;
    if(r.wordWrap) {optWordWrap.checked=true;applyWrap(true);}
    if(r.autoFormat) optAutoFormat.checked=true;
  });
}
function saveSettings(){
  if(typeof chrome==='undefined'||!chrome.storage)return;
  chrome.storage.local.set({
    darkMode:document.body.classList.contains('dark'),
    indent:indentSelect.value,format:formatSelect.value,
    sortKeys:optSortKeys.checked,wordWrap:optWordWrap.checked,
    autoFormat:optAutoFormat.checked
  });
}

// ── Events ────────────────────────────────────────────────────
function bindEvents(){
  prettifyBtn.addEventListener('click',prettify);
  minifyBtn.addEventListener('click',minify);
  validateBtn.addEventListener('click',validate);
  copyBtn.addEventListener('click',copyOutput);
  downloadBtn.addEventListener('click',downloadOutput);
  clearBtn.addEventListener('click',clearAll);
  pasteBtn.addEventListener('click',pasteClip);
  sampleBtn.addEventListener('click',loadSample);
  darkToggle.addEventListener('click',function(){document.body.classList.toggle('dark');saveSettings();});
  escapeBtn.addEventListener('click',toggleEscape);
  uploadBtn.addEventListener('click',function(){fileInput.click();});
  fileInput.addEventListener('change',handleFile);

  formatSelect.addEventListener('change',function(){saveSettings();autoDetectBadge();});
  indentSelect.addEventListener('change',saveSettings);
  optSortKeys.addEventListener('change',saveSettings);
  optWordWrap.addEventListener('change',function(){applyWrap(optWordWrap.checked);saveSettings();});
  optAutoFormat.addEventListener('change',saveSettings);

  inputEditor.addEventListener('input',onInput);
  inputEditor.addEventListener('scroll',function(){inputLineNums.scrollTop=inputEditor.scrollTop;});
  inputEditor.addEventListener('paste',function(){if(optAutoFormat.checked)setTimeout(prettify,60);});
  inputEditor.addEventListener('keydown',function(e){
    if(e.key==='Tab'){
      e.preventDefault();
      var s=inputEditor.selectionStart,en=inputEditor.selectionEnd;
      var sp=indentSelect.value==='tab'?'\t':' '.repeat(parseInt(indentSelect.value)||2);
      inputEditor.value=inputEditor.value.slice(0,s)+sp+inputEditor.value.slice(en);
      inputEditor.selectionStart=inputEditor.selectionEnd=s+sp.length;
      onInput();
    }
  });

  // Convert dropdown
  convertBtn.addEventListener('click',function(e){
    e.stopPropagation();
    convOpen=!convOpen;
    convertMenu.style.display=convOpen?'block':'none';
  });
  convertMenu.addEventListener('click',function(e){
    var item=e.target.closest('.drop-item');
    if(!item)return;
    convOpen=false;convertMenu.style.display='none';
    doConvert(item.dataset.from,item.dataset.to);
  });
  document.addEventListener('click',function(){
    if(convOpen){convOpen=false;convertMenu.style.display='none';}
  });

  // Search
  searchToggle.addEventListener('click',toggleSearch);
  closeSearchBtn.addEventListener('click',closeSearch);
  findInput.addEventListener('input',onFind);
  replaceOneBtn.addEventListener('click',replOne);
  replaceAllBtn.addEventListener('click',replAll);
  findInput.addEventListener('keydown',function(e){if(e.key==='Enter')replAll();});

  // Keyboard shortcuts
  document.addEventListener('keydown',function(e){
    var ctrl=e.ctrlKey||e.metaKey;
    if(ctrl&&e.key==='Enter'){e.preventDefault();prettify();}
    else if(ctrl&&e.key==='m'){e.preventDefault();minify();}
    else if(ctrl&&e.shiftKey&&(e.key==='C')){e.preventDefault();copyOutput();}
    else if(ctrl&&e.shiftKey&&(e.key==='X')){e.preventDefault();clearAll();}
    else if(ctrl&&e.shiftKey&&(e.key==='V'||e.key==='v')){e.preventDefault();validate();}
    else if(ctrl&&e.key==='h'){e.preventDefault();toggleSearch();}
    else if(e.key==='Escape'&&searchBar.style.display!=='none'){closeSearch();}
  });
}

// ── Input ─────────────────────────────────────────────────────
function onInput(){
  renderGutter(inputLineNums,inputEditor.value.split('\n').length);
  updateInputStats();
  inputError.textContent='';
  clearTimeout(debT);
  debT=setTimeout(autoDetectBadge,280);
}

function autoDetectBadge(){
  var t=inputEditor.value.trim();
  if(!t){detectedBadge.style.display='none';return;}
  var fmt=detect(t);
  if(fmt==='unknown'){detectedBadge.style.display='none';return;}
  detectedBadge.textContent=fmt.toUpperCase();
  detectedBadge.className='fmt-chip fmt-chip-active';
  detectedBadge.style.display='';
}

function updateInputStats(){
  var v=inputEditor.value;
  inputStats.textContent=v.split('\n').length+' lines · '+v.length+' chars';
}

// ── Format detection ──────────────────────────────────────────
function detect(text){
  var m=formatSelect.value; if(m!=='auto')return m;
  var t=text.trim();
  if((t.startsWith('{')||t.startsWith('['))&&isJSON(t))return 'json';
  if(t.startsWith('<')){
    if(/^<!doctype\s+html/i.test(t)||/^<html/i.test(t))return 'html';
    return 'xml';
  }
  if(typeof HTMLFormatter!=='undefined'&&HTMLFormatter.isHTML(t))return 'html';
  if(typeof YAMLParser!=='undefined'&&YAMLParser.isYAML(t))return 'yaml';
  if(typeof TOMLParser!=='undefined'&&TOMLParser.isTOML(t))return 'toml';
  if(typeof CSVParser!=='undefined'&&CSVParser.isCSV(t))return 'csv';
  if(isJSON(t))return 'json';
  return 'unknown';
}

// ── Prettify ──────────────────────────────────────────────────
function prettify(){
  var text=inputEditor.value.trim();
  if(!text){setStatus('error','Paste some data first');return;}
  var fmt=detect(text);
  if(fmt==='unknown'){showErr('Could not detect format — select manually');return;}
  try{
    var result=format(text,fmt,getIndent());
    setOutput(result,fmt);clearErr();
    setStatus('success',fmt.toUpperCase()+' formatted ✓');
  }catch(e){
    var msg=errMsg(fmt); showErr(msg);setStatus('error',msg);
    setOutErr(msg,e.message);
  }
}

function format(text,fmt,indent){
  if(fmt==='json'){
    var obj=JSON.parse(text);
    if(optSortKeys.checked&&typeof obj==='object'&&obj!==null&&!Array.isArray(obj))obj=sortObj(obj);
    return JSON.stringify(obj,null,indent);
  }
  if(fmt==='xml')return fmtXML(text,indent);
  if(fmt==='yaml'){if(typeof YAMLParser==='undefined')throw new Error('YAML parser unavailable');var o=YAMLParser.parse(text);return YAMLParser.stringify(o,typeof indent==='string'?2:indent);}
  if(fmt==='toml'){if(typeof TOMLParser==='undefined')throw new Error('TOML parser unavailable');var o2=TOMLParser.parse(text);return TOMLParser.stringify(o2);}
  if(fmt==='csv'){if(typeof CSVParser==='undefined')throw new Error('CSV parser unavailable');return CSVParser.format(text,indent);}
  if(fmt==='html'){if(typeof HTMLFormatter==='undefined')throw new Error('HTML formatter unavailable');return HTMLFormatter.prettify(text,indent);}
  throw new Error('Unsupported');
}

function sortObj(obj){
  var s={};Object.keys(obj).sort().forEach(function(k){var v=obj[k];s[k]=(v&&typeof v==='object'&&!Array.isArray(v))?sortObj(v):v;});
  return s;
}

// ── Minify ────────────────────────────────────────────────────
function minify(){
  var text=inputEditor.value.trim();
  if(!text){setStatus('error','Paste some data first');return;}
  var fmt=detect(text);
  try{
    var r,of=fmt;
    if(fmt==='json')r=JSON.stringify(JSON.parse(text));
    else if(fmt==='xml')r=text.replace(/>\s+</g,'><').replace(/\s{2,}/g,' ').trim();
    else if(fmt==='yaml'){r=JSON.stringify(YAMLParser.parse(text));of='json';}
    else if(fmt==='toml'){r=JSON.stringify(TOMLParser.parse(text));of='json';}
    else if(fmt==='csv')r=text.split('\n').map(function(l){return l.split(',').map(function(c){return c.trim();}).join(',');}).join('\n');
    else if(fmt==='html')r=text.replace(/>\s+</g,'><').replace(/\s{2,}/g,' ').trim();
    else r=text.replace(/\s+/g,' ').trim();
    setOutput(r,of);clearErr();setStatus('success','Minified ✓');
  }catch(e){var msg=errMsg(fmt);showErr(msg);setStatus('error',msg);setOutErr(msg,e.message);}
}

// ── Validate ──────────────────────────────────────────────────
function validate(){
  var text=inputEditor.value.trim();
  if(!text){setStatus('error','Nothing to validate');return;}
  var fmt=detect(text);var ok=false;var detail='';
  try{
    if(fmt==='json'){JSON.parse(text);ok=true;detail='Valid JSON';}
    else if(fmt==='xml'){
      var doc=new DOMParser().parseFromString(text,'text/xml');
      var pe=doc.querySelector('parsererror');
      if(pe)detail=pe.textContent.trim().slice(0,120);
      else{ok=true;detail='Valid XML — '+doc.querySelectorAll('*').length+' elements';}
    }
    else if(fmt==='yaml'){YAMLParser.parse(text);ok=true;detail='Valid YAML';}
    else if(fmt==='toml'){TOMLParser.parse(text);ok=true;detail='Valid TOML';}
    else if(fmt==='csv'){var rows=CSVParser.parse(text);ok=true;detail='Valid CSV — '+rows.length+' rows × '+rows[0].length+' cols';}
    else if(fmt==='html'){new DOMParser().parseFromString(text,'text/html');ok=true;detail='Valid HTML';}
    else detail='Unknown format';
  }catch(e){detail=e.message.slice(0,120);}
  showValidateBanner(ok,detail);
  setStatus(ok?'success':'error',(ok?'✓ Valid ':'✗ ')+detail.slice(0,70));
}

function showValidateBanner(ok,detail){
  var ex=outputEditor.querySelector('.validate-banner');if(ex)ex.remove();
  var b=document.createElement('div');
  b.className='validate-banner '+(ok?'ok':'err');
  b.innerHTML=(ok
    ?'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
    :'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
  )+' '+esc(detail);
  outputEditor.insertBefore(b,outputEditor.firstChild);
  setTimeout(function(){if(b.parentNode)b.remove();},5000);
}

// ── Convert ───────────────────────────────────────────────────
function doConvert(from,to){
  var text=inputEditor.value.trim();
  if(!text){setStatus('error','Paste data first');return;}
  try{
    var obj=parseAny(text,from);
    var result=serAs(obj,to);
    setOutput(result,to);
    formatSelect.value=to;
    setStatus('success',from.toUpperCase()+' → '+to.toUpperCase()+' ✓');
  }catch(e){setStatus('error','Convert failed: '+e.message.slice(0,60));showErr('Convert error: '+e.message.slice(0,80));}
}

function parseAny(text,fmt){
  if(fmt==='json')return JSON.parse(text);
  if(fmt==='xml')return xmlToObj(text);
  if(fmt==='yaml')return YAMLParser.parse(text);
  if(fmt==='toml')return TOMLParser.parse(text);
  if(fmt==='csv'){var rows=CSVParser.parse(text);var keys=rows[0];return rows.slice(1).map(function(r){var o={};keys.forEach(function(k,i){o[k]=r[i]||'';});return o;});}
  throw new Error('Cannot parse '+fmt);
}
function serAs(obj,to){
  var indent=getIndent();
  if(to==='json')return JSON.stringify(obj,null,indent);
  if(to==='yaml')return YAMLParser.stringify(obj,typeof indent==='string'?2:indent);
  if(to==='toml')return TOMLParser.stringify(obj);
  if(to==='xml')return objToXML(obj);
  if(to==='csv'){if(!Array.isArray(obj))throw new Error('CSV requires array');var keys=Object.keys(obj[0]||{});var lines=[keys.join(',')];obj.forEach(function(row){lines.push(keys.map(function(k){return '"'+(row[k]||'')+'"';}).join(','));});return lines.join('\n');}
  throw new Error('Cannot serialize to '+to);
}

// XML helpers
function xmlToObj(xml){var doc=new DOMParser().parseFromString(xml,'text/xml');var pe=doc.querySelector('parsererror');if(pe)throw new Error(pe.textContent.trim().slice(0,80));return nodeToObj(doc.documentElement);}
function nodeToObj(node){var obj={};Array.from(node.attributes||[]).forEach(function(a){obj['@'+a.name]=a.value;});Array.from(node.childNodes).forEach(function(c){if(c.nodeType===3){var t=c.textContent.trim();if(t)obj['#text']=t;}else if(c.nodeType===1){var k=c.nodeName;var v=nodeToObj(c);if(obj[k]){if(!Array.isArray(obj[k]))obj[k]=[obj[k]];obj[k].push(v);}else obj[k]=v;}});if(Object.keys(obj).length===1&&obj['#text']!==undefined)return obj['#text'];return obj;}
function objToXML(obj){return'<?xml version="1.0" encoding="UTF-8"?>\n<root>\n'+buildXML(obj,2)+'</root>';}
function buildXML(data,lv){var pad=' '.repeat(lv);var out='';if(Array.isArray(data)){data.forEach(function(item){out+=pad+'<item>\n'+buildXML(item,lv+2)+pad+'</item>\n';});}else if(data!==null&&typeof data==='object'){Object.entries(data).forEach(function(kv){var k=kv[0];var v=kv[1];if(typeof v==='object'&&v!==null)out+=pad+'<'+k+'>\n'+buildXML(v,lv+2)+pad+'</'+k+'>\n';else out+=pad+'<'+k+'>'+esc(String(v||''))+'</'+k+'>\n';});}else out+=pad+esc(String(data||''))+'\n';return out;}

// ── XML Prettifier ────────────────────────────────────────────
function fmtXML(xml,indent){
  var doc=new DOMParser().parseFromString(xml,'text/xml');
  var pe=doc.querySelector('parsererror');if(pe)throw new Error(pe.textContent.trim().slice(0,80));
  var ind=typeof indent==='string'?'\t':' '.repeat(indent);
  var result='';var level=0;
  var decl=xml.match(/^<\?xml[^?]*\?>/);var src=xml;
  if(decl){result+=decl[0]+'\n';src=xml.slice(decl[0].length).trim();}
  var tokens=src.match(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g)||[];
  tokens.forEach(function(tok){
    var t=tok.trim();if(!t)return;
    if(t.startsWith('<!--'))       {result+=ind.repeat(level)+t+'\n';}
    else if(t.startsWith('<![CDATA')){result+=ind.repeat(level)+t+'\n';}
    else if(t.startsWith('</'))    {level=Math.max(0,level-1);result+=ind.repeat(level)+t+'\n';}
    else if(t.startsWith('<?'))    {result+=ind.repeat(level)+t+'\n';}
    else if(t.endsWith('/>'))      {result+=ind.repeat(level)+t+'\n';}
    else if(t.startsWith('<'))     {result+=ind.repeat(level)+t+'\n';level++;}
    else{var tx=t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(tx.trim())result+=ind.repeat(level)+xmlEsc(tx.trim())+'\n';}
  });
  return result.trimEnd();
}
function xmlEsc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ── Escape/Unescape ───────────────────────────────────────────
function toggleEscape(){
  var text=inputEditor.value;if(!text)return;
  var hasEnts=/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/i.test(text);
  if(hasEnts){
    inputEditor.value=text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(+n);}).replace(/&#x([\da-f]+);/gi,function(_,h){return String.fromCharCode(parseInt(h,16));});
    setStatus('success','Unescaped HTML entities');escapeBtn.textContent='Escape';
  }else{
    inputEditor.value=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    setStatus('success','Escaped HTML entities');escapeBtn.textContent='Unescape';
  }
  onInput();
}

// ── File upload ───────────────────────────────────────────────
function handleFile(e){
  var file=e.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    inputEditor.value=ev.target.result;onInput();
    setStatus('info','Loaded: '+file.name);
    var ext=file.name.split('.').pop().toLowerCase();
    var em={json:'json',xml:'xml',yaml:'yaml',yml:'yaml',toml:'toml',csv:'csv',html:'html',htm:'html'};
    if(em[ext])formatSelect.value=em[ext];
    fileInput.value='';
  };
  reader.readAsText(file);
}

// ── Output rendering ──────────────────────────────────────────
function setOutput(text,fmt){
  curOut=text;curFmt=fmt;
  outputBadge.textContent=fmt.toUpperCase();
  outputBadge.className='fmt-chip fmt-chip-active';
  outputBadge.style.display='';
  if(fmt==='csv'&&typeof CSVParser!=='undefined'){renderCSV(text);}
  else{
    var hl=highlight(text,fmt);
    var lines=hl.split('\n');var html='<pre>';
    lines.forEach(function(line,i){html+='<span class="ln"><span class="ln-n">'+(i+1)+'</span>'+line+'</span>\n';});
    html+='</pre>';
    outputEditor.innerHTML=html;
  }
  renderGutter(outputLineNums,text.split('\n').length);
  if(text){var bytes=new TextEncoder().encode(text).length;outputStats2.textContent=text.split('\n').length+' lines · '+fmtBytes(bytes);}
  outputEditor.scrollTop=0;
  outputEditor.addEventListener('scroll',function(){outputLineNums.scrollTop=outputEditor.scrollTop;},{passive:true});
}

function renderCSV(text){
  var rows=CSVParser.parse(text);if(!rows.length)return;
  var html='<div class="csv-table-wrap"><table class="csv-table"><thead><tr>';
  rows[0].forEach(function(h){html+='<th>'+esc(h.trim())+'</th>';});
  html+='</tr></thead><tbody>';
  for(var r=1;r<rows.length;r++){
    html+='<tr>';rows[0].forEach(function(_,c){html+='<td>'+esc((rows[r][c]||'').trim())+'</td>';});html+='</tr>';
  }
  html+='</tbody></table></div>';
  outputEditor.innerHTML=html;
  outputLineNums.textContent='';
}

function setOutErr(label,detail){
  curOut='';curFmt='';
  outputBadge.textContent='Error';outputBadge.className='fmt-chip fmt-chip-err';outputBadge.style.display='';
  outputEditor.innerHTML='<div class="empty-state"><div class="empty-icon" style="background:var(--red-bg);color:var(--red)"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div><p class="empty-title" style="color:var(--red)">'+esc(label)+'</p><p class="empty-hint">'+esc(detail.slice(0,120))+'</p></div>';
  outputStats2.textContent='';renderGutter(outputLineNums,0);
}

// ── Syntax highlighting ───────────────────────────────────────
function highlight(code,fmt){
  var e=esc(code);
  if(fmt==='json')return hlJSON(e);
  if(fmt==='xml')return hlXML(e);
  if(fmt==='yaml')return hlYAML(e);
  if(fmt==='toml')return hlTOML(e);
  if(fmt==='html')return hlHTML(e);
  return e;
}
function hlJSON(c){return c.replace(/(\"(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}\[\],:])/g,function(m){if(/^"/.test(m)){if(/:$/.test(m))return'<span class="s-key">'+m.slice(0,-1)+'</span>:';return'<span class="s-string">'+m+'</span>';}if(/true|false/.test(m))return'<span class="s-bool">'+m+'</span>';if(/null/.test(m))return'<span class="s-null">'+m+'</span>';if(/[{}\[\]]/.test(m))return'<span class="s-br">'+m+'</span>';if(/[:,]/.test(m))return'<span class="s-pt">'+m+'</span>';return'<span class="s-number">'+m+'</span>';});}
function hlXML(c){return c.replace(/(&lt;!--[\s\S]*?--&gt;)/g,'<span class="x-cmt">$1</span>').replace(/(&lt;!\[CDATA\[[\s\S]*?\]\]&gt;)/g,'<span class="x-cd">$1</span>').replace(/(&lt;!DOCTYPE[^&]*&gt;)/gi,'<span class="x-dt">$1</span>').replace(/(&lt;\?[\s\S]*?\?&gt;)/g,'<span class="x-pi">$1</span>').replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g,function(_,op,tag,attrs,cl){var ha=attrs.replace(/([\w:-]+)(=)(&quot;[^&]*&quot;)/g,'<span class="x-attr">$1</span><span class="x-eq">$2</span><span class="x-val">$3</span>');return'<span class="x-ang">'+op+'</span><span class="x-tag">'+tag+'</span>'+ha+'<span class="x-ang">'+cl+'</span>';});}
function hlYAML(c){return c.split('\n').map(function(line){if(/^\s*#/.test(line))return'<span class="y-cmt">'+line+'</span>';var dm=line.match(/^(\s*)(- )(.*)/);if(dm)return dm[1]+'<span class="y-dash">-</span> '+hlYV(dm[3]);var kv=line.match(/^(\s*)([^:]+)(:)(\s+)(.*)?$/);if(kv){var val=(kv[5]||'').trim();return kv[1]+'<span class="y-key">'+kv[2].trim()+'</span>: '+(val?hlYV(val):'');}return line;}).join('\n');}
function hlYV(v){if(!v||v==='null'||v==='~')return'<span class="y-null">'+v+'</span>';if(v==='true'||v==='false')return'<span class="y-bool">'+v+'</span>';if(/^-?\d+(\.\d+)?$/.test(v))return'<span class="y-num">'+v+'</span>';if(v.startsWith('"')||v.startsWith("'"))return'<span class="y-str">'+v+'</span>';return'<span class="y-val">'+v+'</span>';}
function hlTOML(c){return c.split('\n').map(function(line){if(/^\s*#/.test(line))return'<span class="y-cmt">'+line+'</span>';if(/^\[/.test(line.trim()))return'<span class="x-tag">'+line+'</span>';var kv=line.match(/^([\w.-]+)\s*(=)\s*(.*)/);if(kv)return'<span class="s-key">'+kv[1]+'</span><span class="s-pt"> = </span>'+hlTV(kv[3]);return line;}).join('\n');}
function hlTV(v){if(v==='true'||v==='false')return'<span class="s-bool">'+v+'</span>';if(v.startsWith('"')||v.startsWith("'"))return'<span class="s-string">'+v+'</span>';if(/^-?\d/.test(v))return'<span class="s-number">'+v+'</span>';return v;}
function hlHTML(c){return c.replace(/(&lt;!--[\s\S]*?--&gt;)/g,'<span class="x-cmt">$1</span>').replace(/(&lt;!DOCTYPE[^&]*&gt;)/gi,'<span class="x-dt">$1</span>').replace(/(&lt;\/?)([\w-]+)([\s\S]*?)(&gt;)/g,function(_,op,tag,attrs,cl){var ha=attrs.replace(/([\w-]+)(=)(&quot;[^&]*&quot;)/g,'<span class="x-attr">$1</span><span class="x-eq">$2</span><span class="x-val">$3</span>');return'<span class="x-ang">'+op+'</span><span class="x-tag">'+tag+'</span>'+ha+'<span class="x-ang">'+cl+'</span>';});}

// ── Copy / Download / Clear ───────────────────────────────────
function copyOutput(){
  if(!curOut){setStatus('error','Nothing to copy');return;}
  navigator.clipboard.writeText(curOut).then(function(){
    setStatus('success','Copied to clipboard ✓');
    copyBtn.classList.add('copy-flash');
    setTimeout(function(){copyBtn.classList.remove('copy-flash');},600);
  }).catch(function(){setStatus('error','Copy failed');});
}
function downloadOutput(){
  if(!curOut){setStatus('error','Nothing to download');return;}
  var ext={json:'json',xml:'xml',yaml:'yaml',toml:'toml',csv:'csv',html:'html'}[curFmt]||'txt';
  var blob=new Blob([curOut],{type:'text/plain'});
  var url=URL.createObjectURL(blob);var a=document.createElement('a');
  a.href=url;a.download='formatted.'+ext;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  setStatus('success','Saved formatted.'+ext);
}
function clearAll(){
  inputEditor.value='';
  outputEditor.innerHTML='<div class="empty-state"><div class="empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg></div><p class="empty-title">Formatted output appears here</p><p class="empty-hint">Choose a format or start typing in the editor</p></div>';
  curOut='';curFmt='';
  outputBadge.style.display='none';detectedBadge.style.display='none';
  inputError.textContent='';statusMsg.textContent='';outputStats2.textContent='';outputStats.textContent='';
  renderGutter(inputLineNums,1);renderGutter(outputLineNums,0);
  updateInputStats();setStatus('ready','Ready. Choose a format and click Format.');
  inputEditor.focus();
}
function pasteClip(){navigator.clipboard.readText().then(function(text){inputEditor.value=text;onInput();setStatus('info','Pasted from clipboard');}).catch(function(){setStatus('error','Clipboard access denied');});}

// ── Samples ───────────────────────────────────────────────────
var SAMPLES={
  json:'{\n  "name": "DataFormat Pro",\n  "version": "3.0",\n  "formats": ["JSON","XML","YAML","TOML","CSV","HTML"],\n  "author": {"name":"Dev Team","email":"hello@example.com"},\n  "active": true,\n  "count": 42,\n  "tags": ["formatter","validator","converter"]\n}',
  xml:'<?xml version="1.0" encoding="UTF-8"?>\n<app>\n  <name>DataFormat Pro</name>\n  <version>3.0</version>\n  <formats>\n    <format>JSON</format>\n    <format>XML</format>\n    <format>YAML</format>\n  </formats>\n  <author email="hello@example.com">\n    <name>Dev Team</name>\n  </author>\n  <active>true</active>\n</app>',
  yaml:'name: DataFormat Pro\nversion: "3.0"\nformats:\n  - JSON\n  - XML\n  - YAML\n  - TOML\nauthor:\n  name: Dev Team\n  email: hello@example.com\nactive: true\ncount: 42',
  toml:'[app]\nname = "DataFormat Pro"\nversion = "3.0"\nactive = true\ncount = 42\n\n[author]\nname = "Dev Team"\nemail = "hello@example.com"\n\nformats = ["JSON","XML","YAML","TOML"]',
  csv:'name,version,active,count\nDataFormat Pro,3.0,true,42\nJSON Formatter,1.5,false,10\nXML Parser,2.1,true,25',
  html:'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>DataFormat Pro</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n  <p class="subtitle">Format your data with ease</p>\n</body>\n</html>'
};
var sIdx=0;var sFmts=['json','xml','yaml','toml','csv','html'];
function loadSample(){var fmt=sFmts[sIdx%sFmts.length];sIdx++;inputEditor.value=SAMPLES[fmt];formatSelect.value=fmt;onInput();setStatus('info','Sample '+fmt.toUpperCase()+' loaded');}

// ── Search & Replace ──────────────────────────────────────────
function toggleSearch(){
  if(!searchBar.style.display||searchBar.style.display==='none'){searchBar.style.display='flex';searchToggle.classList.add('active');findInput.focus();}
  else closeSearch();
}
function closeSearch(){searchBar.style.display='none';searchToggle.classList.remove('active');matchCount.textContent='';}
function onFind(){var n=findInput.value;if(!n){matchCount.textContent='';return;}var hits=(inputEditor.value.match(new RegExp(escRe(n),'g'))||[]).length;matchCount.textContent=hits+' match'+(hits!==1?'es':'');}
function replOne(){var n=findInput.value;if(!n)return;var v=inputEditor.value;var i=v.indexOf(n);if(i===-1){setStatus('info','No match');return;}inputEditor.value=v.slice(0,i)+replaceInput.value+v.slice(i+n.length);onInput();onFind();setStatus('success','Replaced 1 match');}
function replAll(){var n=findInput.value;if(!n)return;var re=new RegExp(escRe(n),'g');var prev=inputEditor.value;var cnt=(prev.match(re)||[]).length;inputEditor.value=prev.replace(re,replaceInput.value);onInput();onFind();setStatus('success','Replaced '+cnt+' match'+(cnt!==1?'es':''));}

// ── Word Wrap ─────────────────────────────────────────────────
function applyWrap(on){editorsEl.classList.toggle('wrap-mode',on);}

// ── Status ────────────────────────────────────────────────────
function setStatus(type,msg){
  statusDot.className='status-dot '+(type==='ready'?'':type);
  statusText.textContent=msg;
  clearTimeout(stT);
  if(type!=='ready')stT=setTimeout(function(){setStatus('ready','Ready. Choose a format and click Format.');},4000);
}
function showErr(msg){inputError.textContent=msg;}
function clearErr(){inputError.textContent='';}
function errMsg(fmt){var m={json:'Invalid JSON format',xml:'Invalid XML format',yaml:'Invalid YAML format',toml:'Invalid TOML format',csv:'Invalid CSV format',html:'Invalid HTML format'};return m[fmt]||'Format error';}

// ── Utils ─────────────────────────────────────────────────────
function isJSON(t){try{JSON.parse(t);return true;}catch(e){return false;}}
function getIndent(){var v=indentSelect.value;return v==='tab'?'\t':parseInt(v)||2;}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function fmtBytes(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB';}
function renderGutter(el,count){var h='';for(var i=1;i<=count;i++)h+=i+'\n';el.textContent=h;}

init();
});
