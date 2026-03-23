/**
 * HTML Formatter — CSP-safe, no eval
 * Uses DOMParser for validation, manual indent for output
 */
(function(global){
'use strict';

var VOID = {area:1,base:1,br:1,col:1,embed:1,hr:1,img:1,input:1,
            link:1,meta:1,param:1,source:1,track:1,wbr:1};

function prettifyHTML(html, indentSize){
  var indent = typeof indentSize==='string'?'\t':' '.repeat(indentSize||2);
  var result=''; var level=0;
  var tokens = html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)||[];

  tokens.forEach(function(tok){
    var t=tok.trim();
    if(!t) return;

    if(t.startsWith('<!--')){
      result+=indent.repeat(level)+t+'\n'; return;
    }
    if(t.startsWith('</')){
      level=Math.max(0,level-1);
      result+=indent.repeat(level)+t+'\n'; return;
    }
    if(t.startsWith('<!')){
      result+=indent.repeat(level)+t+'\n'; return;
    }
    if(t.startsWith('<')){
      var tagMatch=t.match(/^<([\w-]+)/);
      var tag=tagMatch?tagMatch[1].toLowerCase():'';
      result+=indent.repeat(level)+t+'\n';
      if(!VOID[tag]&&!t.endsWith('/>')) level++;
      return;
    }
    // text
    if(t) result+=indent.repeat(level)+t+'\n';
  });
  return result.trimEnd();
}

function isHTML(text){
  var t=text.trim().toLowerCase();
  return t.startsWith('<!doctype html')||t.startsWith('<html')||
         (t.startsWith('<')&&/^<[a-z][\w-]*[\s>]/.test(t)&&!t.startsWith('<?xml'));
}

global.HTMLFormatter={
  prettify: prettifyHTML,
  isHTML: isHTML
};
})(window);
