/**
 * Minimal CSV Parser/Formatter — CSP-safe
 */
(function(global){
'use strict';

function parseCSV(text){
  var lines = text.trim().split('\n');
  var result = [];
  for(var i=0;i<lines.length;i++){
    result.push(parseCSVLine(lines[i]));
  }
  return result;
}

function parseCSVLine(line){
  var cols=[]; var cur=''; var inQ=false;
  for(var i=0;i<line.length;i++){
    var c=line[i];
    if(c==='"'){
      if(inQ && line[i+1]==='"'){cur+='"';i++;}
      else inQ=!inQ;
    } else if(c===','&&!inQ){
      cols.push(cur); cur='';
    } else cur+=c;
  }
  cols.push(cur);
  return cols;
}

function formatCSV(text, indent){
  try {
    var rows = parseCSV(text);
    if(!rows.length) return text;
    var cols = rows[0].length;
    var widths = [];
    for(var c=0;c<cols;c++){
      var max=0;
      for(var r=0;r<rows.length;r++){
        var cell=(rows[r][c]||'').trim();
        if(cell.length>max) max=cell.length;
      }
      widths.push(max);
    }
    var lines=[];
    for(var r=0;r<rows.length;r++){
      var cells=[];
      for(var c=0;c<cols;c++){
        var cell=(rows[r][c]||'').trim();
        cells.push(cell.padEnd(widths[c]));
      }
      lines.push(cells.join('  |  '));
      if(r===0){
        lines.push(widths.map(function(w){return '-'.repeat(w);}).join('--+--'));
      }
    }
    return lines.join('\n');
  } catch(e){ return text; }
}

function isCSV(text){
  var t=text.trim();
  var firstLine=t.split('\n')[0];
  var commas=(firstLine.match(/,/g)||[]).length;
  return commas>=1 && !t.startsWith('<') && !t.startsWith('{');
}

global.CSVParser={
  parse: parseCSV,
  format: formatCSV,
  isCSV: isCSV
};
})(window);
