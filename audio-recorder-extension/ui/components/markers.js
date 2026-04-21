// markers.js
var MarkersComponent = {
  render(container, markers, onSeek) {
    DOMHelpers.clearElement(container);
    if (!markers || !markers.length) {
      const p = document.createElement('p');
      p.style.cssText = 'text-align:center;color:var(--text-muted);font-size:12px;padding:8px;';
      p.textContent = 'No markers';
      container.appendChild(p);
      return;
    }
    markers.forEach(m => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-radius:6px;background:var(--surface);margin-bottom:4px;cursor:pointer;font-size:12px;';
      const time = document.createElement('span');
      time.style.fontVariantNumeric = 'tabular-nums';
      time.textContent = Formatters.formatDuration(m.timestamp);
      const label = document.createElement('span');
      label.textContent = SecurityUtils.sanitizeText(m.label);
      row.appendChild(time);
      row.appendChild(label);
      row.addEventListener('click', () => { if (onSeek) onSeek(m.timestamp); });
      container.appendChild(row);
    });
  }
};
