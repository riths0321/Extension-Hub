/**
 * Minimal TOML Parser — CSP-safe, no eval
 * Supports: strings, integers, floats, booleans, arrays, inline tables, [sections]
 */
(function(global){
'use strict';

function parseTOML(src){
  var lines = src.split('\n');
  var root = {};
  var current = root;
  var path = [];

  for(var i=0;i<lines.length;i++){
    var line = lines[i].trim();
    if(!line || line.startsWith('#')) continue;

    // [section] or [[array-section]]
    if(line.startsWith('[[')){
      var key = line.slice(2,line.indexOf(']]')).trim();
      var parts = key.split('.');
      current = root;
      path = [];
      for(var p=0;p<parts.length-1;p++){
        if(!current[parts[p]]) current[parts[p]]={};
        current = current[parts[p]];
        path.push(parts[p]);
      }
      var last = parts[parts.length-1];
      if(!current[last]) current[last]=[];
      var newObj={};
      current[last].push(newObj);
      current = newObj;
      continue;
    }
    if(line.startsWith('[')){
      var key = line.slice(1,line.indexOf(']')).trim();
      var parts = key.split('.');
      current = root;
      for(var p=0;p<parts.length;p++){
        if(!current[parts[p]]) current[parts[p]]={};
        current = current[parts[p]];
      }
      continue;
    }

    // key = value
    var eq = line.indexOf('=');
    if(eq===-1) continue;
    var k = line.slice(0,eq).trim();
    var v = line.slice(eq+1).trim();
    current[k] = parseValue(v);
  }
  return root;
}

function parseValue(v){
  if(v.startsWith('"') && v.endsWith('"')) return v.slice(1,-1).replace(/\\n/g,'\n').replace(/\\t/g,'\t');
  if(v.startsWith("'") && v.endsWith("'")) return v.slice(1,-1);
  if(v==='true') return true;
  if(v==='false') return false;
  if(v.startsWith('[') && v.endsWith(']')){
    var inner=v.slice(1,-1).trim();
    if(!inner) return [];
    return inner.split(',').map(function(s){return parseValue(s.trim());});
  }
  if(v.startsWith('{') && v.endsWith('}')){
    var obj={};
    var inner=v.slice(1,-1).trim();
    if(inner) inner.split(',').forEach(function(pair){
      var ei=pair.indexOf('=');
      if(ei>-1) obj[pair.slice(0,ei).trim()]=parseValue(pair.slice(ei+1).trim());
    });
    return obj;
  }
  if(!isNaN(v) && v!=='') return Number(v);
  return v;
}

function stringifyTOML(obj, prefix){
  prefix = prefix||'';
  var simple=[]; var complex=[];
  Object.keys(obj).forEach(function(k){
    var v=obj[k];
    if(v===null||v===undefined||typeof v==='boolean'||typeof v==='number'||typeof v==='string') simple.push(k);
    else if(Array.isArray(v) && v.length && typeof v[0]==='object') complex.push(k);
    else if(Array.isArray(v)) simple.push(k);
    else complex.push(k);
  });

  var out='';
  simple.forEach(function(k){
    out += k+' = '+tomlVal(obj[k])+'\n';
  });
  complex.forEach(function(k){
    var v=obj[k];
    if(Array.isArray(v) && v.length && typeof v[0]==='object'){
      v.forEach(function(item){
        out+='\n[['+(prefix?prefix+'.':'')+k+']]\n';
        out+=stringifyTOML(item,(prefix?prefix+'.':'')+k);
      });
    } else if(typeof v==='object' && v!==null){
      out+='\n['+(prefix?prefix+'.':'')+k+']\n';
      out+=stringifyTOML(v,(prefix?prefix+'.':'')+k);
    }
  });
  return out;
}

function tomlVal(v){
  if(typeof v==='string') return '"'+v.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n')+'"';
  if(typeof v==='boolean') return v?'true':'false';
  if(Array.isArray(v)) return '['+v.map(tomlVal).join(', ')+']';
  return String(v);
}

function isTOML(text){
  var t=text.trim();
  return /^\[[\w.]+\]/m.test(t) || /^[\w.-]+\s*=/m.test(t);
}

global.TOMLParser={
  parse: parseTOML,
  stringify: stringifyTOML,
  isTOML: isTOML
};
})(window);
