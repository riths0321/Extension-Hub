/**
 * dropdowns.js — Custom dropdown wiring for Format, Indent, Convert
 * CSP-safe · MV3 · no eval
 */
(function(){
'use strict';

document.addEventListener('DOMContentLoaded', function(){

  // ── Generic dropdown factory ────────────────────────────────
  function initDropdown(btnId, menuId, wrapId, onSelect, alignRight){
    var btn  = document.getElementById(btnId);
    var menu = document.getElementById(menuId);
    var wrap = document.getElementById(wrapId);
    if(!btn || !menu) return;

    if(alignRight && wrap) wrap.classList.add('align-right');

    var isOpen = false;

    function open(){
      isOpen = true;
      menu.style.display = 'block';
      btn.classList.add('open');
    }
    function close(){
      isOpen = false;
      menu.style.display = 'none';
      btn.classList.remove('open');
    }
    function toggle(e){
      e.stopPropagation();
      isOpen ? close() : open();
    }

    btn.addEventListener('click', toggle);

    menu.addEventListener('click', function(e){
      var item = e.target.closest('.cdm-item');
      if(!item) return;
      close();
      if(onSelect) onSelect(item);
    });

    // Close on outside click
    document.addEventListener('click', function(e){
      if(isOpen && !wrap.contains(e.target)) close();
    });
  }

  // ── Format dropdown ─────────────────────────────────────────
  var fmtSelect = document.getElementById('formatSelect');
  var fmtLabel  = document.getElementById('fmtLabel');

  initDropdown('fmtDropBtn','fmtMenu','fmtDropWrap', function(item){
    var val = item.dataset.val;
    // update label
    fmtLabel.textContent = item.textContent.trim();
    // update hidden select
    if(fmtSelect) fmtSelect.value = val;
    // update active state
    document.querySelectorAll('#fmtMenu .cdm-item').forEach(function(i){
      i.classList.toggle('active', i.dataset.val === val);
    });
    // fire change event so popup.js picks it up
    if(fmtSelect) fmtSelect.dispatchEvent(new Event('change'));
  });

  // ── Indent dropdown ─────────────────────────────────────────
  var indSelect = document.getElementById('indentSelect');
  var indLabel  = document.getElementById('indLabel');

  initDropdown('indDropBtn','indMenu','indDropWrap', function(item){
    var val = item.dataset.val;
    indLabel.textContent = item.textContent.trim();
    if(indSelect) indSelect.value = val;
    document.querySelectorAll('#indMenu .cdm-item').forEach(function(i){
      i.classList.toggle('active', i.dataset.val === val);
    });
    if(indSelect) indSelect.dispatchEvent(new Event('change'));
  });

  // ── Convert dropdown ─────────────────────────────────────────
  initDropdown('convertBtn','convertMenu','convertWrap', function(item){
    var from = item.dataset.from;
    var to   = item.dataset.to;
    if(!from || !to) return;
    // Dispatch custom event for popup.js to handle
    document.dispatchEvent(new CustomEvent('dfp:convert', {detail:{from:from, to:to}}));
  }, true); // align right

  // ── Keep dropdown labels in sync with popup.js settings restore ──
  // Poll once after load to sync labels if popup.js restores saved values
  setTimeout(function(){
    if(fmtSelect && fmtLabel){
      var val = fmtSelect.value;
      var item = document.querySelector('#fmtMenu .cdm-item[data-val="'+val+'"]');
      if(item){
        fmtLabel.textContent = item.textContent.trim();
        document.querySelectorAll('#fmtMenu .cdm-item').forEach(function(i){
          i.classList.toggle('active', i.dataset.val === val);
        });
      }
    }
    if(indSelect && indLabel){
      var val2 = indSelect.value;
      var item2 = document.querySelector('#indMenu .cdm-item[data-val="'+val2+'"]');
      if(item2){
        indLabel.textContent = item2.textContent.trim();
        document.querySelectorAll('#indMenu .cdm-item').forEach(function(i){
          i.classList.toggle('active', i.dataset.val === val2);
        });
      }
    }
  }, 300);

});
})();
