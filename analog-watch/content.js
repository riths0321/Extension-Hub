// Create a shadow host
if (!document.getElementById("analog-watch-extension-root")) {
  const host = document.createElement("div");
  host.id = "analog-watch-extension-root";
  host.style.position = "fixed";
  host.style.bottom = "20px";
  host.style.right = "20px";
  host.style.zIndex = "2147483647"; // Max z-index
  host.style.width = "0";
  host.style.height = "0";
  // Reset all inherited styles to avoid page CSS affecting the host
  host.style.all = "initial";
  // Restore necessary styles
  host.style.position = "fixed";
  host.style.bottom = "20px";
  host.style.right = "20px";
  host.style.zIndex = "2147483647";

  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    #analog-watch {
      position: relative; /* Relative to host */
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle at center, #111 0%, #000 70%);
      border: 4px solid #444;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      cursor: move;
      overflow: hidden;
    }
  
    .hand {
      position: absolute;
      left: 50%;
      top: 50%;
      transform-origin: bottom center;
      background: white;
      border-radius: 4px;
      z-index: 10;
    }
  
    .hour {
      width: 6px;
      height: 30px;
      margin-left: -3px;
      margin-top: -30px;
      background: #ccc;
    }
  
    .minute {
      width: 4px;
      height: 40px;
      margin-left: -2px;
      margin-top: -40px;
      background: #eee;
    }
  
    .second {
      width: 2px;
      height: 45px;
      margin-left: -1px;
      margin-top: -45px;
      background: red;
      z-index: 11;
    }
  
    .center-dot {
      position: absolute;
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 12;
    }
  
    /* Roman numeral marks */
    .mark {
      position: absolute;
      color: white;
      font-family: 'Times New Roman', serif;
      font-weight: bold;
      text-align: center;
      line-height: 1;
      pointer-events: none;
    }
  
    .mark-hour {
      color: #fff;
      font-size: 12px;
      font-weight: normal;
      text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
    }
  
    .mark-minute {
      width: 2px;
      height: 4px;
      background: #666;
      border-radius: 1px;
      color: transparent !important;
    }
  `;
  shadow.appendChild(style);

  const watch = document.createElement("div");
  watch.id = "analog-watch";

  // Roman Numerals
  const romanNumerals = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  for (let i = 0; i < 12; i++) {
    const mark = document.createElement("div");
    mark.className = "mark mark-hour";
    const angle = (i * 30) * Math.PI / 180;
    const radius = 35;
    const x = 50 + Math.sin(angle) * radius;
    const y = 50 - Math.cos(angle) * radius;
    mark.textContent = romanNumerals[i];
    mark.style.left = `${x}%`;
    mark.style.top = `${y}%`;
    mark.style.transform = `translate(-50%, -50%)`;
    watch.appendChild(mark);
  }

  // Minute Marks
  for (let i = 0; i < 60; i++) {
    if (i % 5 !== 0) {
      const mark = document.createElement("div");
      mark.className = "mark mark-minute";
      const angle = (i * 6) * Math.PI / 180;
      const radius = 42;
      const x = 50 + Math.sin(angle) * radius;
      const y = 50 - Math.cos(angle) * radius;
      mark.style.left = `${x}%`;
      mark.style.top = `${y}%`;
      mark.style.transform = `translate(-50%, -50%) rotate(${i * 6}deg)`;
      mark.style.transformOrigin = 'center';
      watch.appendChild(mark);
    }
  }

  const hour = document.createElement("div");
  hour.className = "hand hour";
  const minute = document.createElement("div");
  minute.className = "hand minute";
  const second = document.createElement("div");
  second.className = "hand second";
  const center = document.createElement("div");
  center.className = "center-dot";

  watch.appendChild(hour);
  watch.appendChild(minute);
  watch.appendChild(second);
  watch.appendChild(center);
  shadow.appendChild(watch);

  // Drag Logic
  let isDragging = false;
  let offsetX, offsetY;

  watch.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);

  function startDrag(e) {
    isDragging = true;
    const rect = host.getBoundingClientRect(); // Use host rect
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    watch.style.cursor = 'grabbing';
  }

  function drag(e) {
    if (!isDragging) return;

    // We move the HOST, not the watch inside
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;

    // Keep within viewport bounds
    // host width is 0, but watch is 120. 
    // We want the watch to stay in bounds.
    // The visual element is 'watch', size 120x120.
    const watchSize = 120;
    const maxX = window.innerWidth - watchSize;
    const maxY = window.innerHeight - watchSize;

    // Position host so that watch (relative to host) is at x,y?
    // Host is fixed. Watch is relative inside host.
    // If host is at x,y, and watch is at 0,0 inside host, then watch is at x,y.

    const constrainedX = Math.min(Math.max(0, x), maxX);
    const constrainedY = Math.min(Math.max(0, y), maxY);

    host.style.left = `${constrainedX}px`;
    host.style.top = `${constrainedY}px`;
    host.style.right = 'auto'; // Clear right/bottom
    host.style.bottom = 'auto';
  }

  function stopDrag() {
    isDragging = false;
    watch.style.cursor = 'move';
  }

  function updateClock() {
    const now = new Date();
    const sec = now.getSeconds();
    const min = now.getMinutes();
    const hr = now.getHours();

    const secDeg = sec * 6;
    const minDeg = min * 6 + sec * 0.1;
    const hrDeg = hr * 30 + min * 0.5;

    second.style.transform = `rotate(${secDeg}deg) translateY(-50%)`;
    minute.style.transform = `rotate(${minDeg}deg) translateY(-50%)`;
    hour.style.transform = `rotate(${hrDeg}deg) translateY(-50%)`;
  }

  setInterval(updateClock, 1000);
  updateClock();
}