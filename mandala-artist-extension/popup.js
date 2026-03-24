document.addEventListener("DOMContentLoaded", async () => {
  const startDrawingBtn = document.getElementById("startDrawing");
  const openCanvasBtn = document.getElementById("openCanvas");
  const symmetrySelect = document.getElementById("symmetry");
  const brushSizeSlider = document.getElementById("brushSize");
  const brushSizeValue = document.getElementById("brushSizeValue");
  const brushColorPicker = document.getElementById("brushColor");
  const patternItems = Array.from(document.querySelectorAll(".pattern-item"));
  const openOptionsBtn = document.getElementById("openOptions");
  const clearCanvasBtn = document.getElementById("clearCanvas");

  const storageData = await chrome.storage.sync.get([
    "symmetry",
    "brushSize",
    "brushColor",
    "pattern"
  ]);

  if (storageData.symmetry) {
    symmetrySelect.value = String(storageData.symmetry);
  }

  if (storageData.brushSize) {
    brushSizeSlider.value = String(storageData.brushSize);
  }

  if (storageData.brushColor) {
    brushColorPicker.value = storageData.brushColor;
  }

  updateBrushSizeLabel(brushSizeSlider.value);
  setActivePattern(storageData.pattern || "");

  brushSizeSlider.addEventListener("input", () => {
    updateBrushSizeLabel(brushSizeSlider.value);
    saveSetting("brushSize", brushSizeSlider.value);
  });

  symmetrySelect.addEventListener("change", () => {
    saveSetting("symmetry", symmetrySelect.value);
  });

  brushColorPicker.addEventListener("change", () => {
    saveSetting("brushColor", brushColorPicker.value);
  });

  startDrawingBtn.addEventListener("click", async () => {
    const settings = currentSettings();

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab?.id || !tab.url) {
        window.close();
        return;
      }

      if (isRestrictedUrl(tab.url)) {
        openMandalaTab();
        window.close();
        return;
      }

      await chrome.storage.sync.set(settings);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: createSimpleMandalaOverlay,
        args: [settings]
      });

      window.close();
    } catch (_error) {
      openMandalaTab();
      window.close();
    }
  });

  openCanvasBtn.addEventListener("click", async () => {
    await chrome.storage.sync.set(currentSettings());
    openMandalaTab();
    window.close();
  });

  patternItems.forEach((item) => {
    item.addEventListener("click", async () => {
      const pattern = item.dataset.pattern || "";
      setActivePattern(pattern);
      await saveSetting("pattern", pattern);
    });
  });

  openOptionsBtn.addEventListener("click", async () => {
    try {
      await chrome.runtime.openOptionsPage();
    } catch (_error) {
      chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
    }
  });

  clearCanvasBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(["mandalaExport"]);
  });

  function currentSettings() {
    return {
      symmetry: symmetrySelect.value,
      brushSize: brushSizeSlider.value,
      brushColor: brushColorPicker.value
    };
  }

  function updateBrushSizeLabel(value) {
    brushSizeValue.textContent = `${value} px`;
  }

  function setActivePattern(pattern) {
    patternItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.pattern === pattern);
    });
  }

  function saveSetting(key, value) {
    return chrome.storage.sync.set({ [key]: value });
  }

  function openMandalaTab() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("content/mandala-canvas.html"),
      active: true
    });
  }

  function isRestrictedUrl(url) {
    return (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:")
    );
  }

  function createSimpleMandalaOverlay(settings) {
    const existing = document.getElementById("simpleMandalaOverlay");
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "simpleMandalaOverlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2147483647";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "24px";
    overlay.style.background = "rgba(19, 10, 30, 0.88)";

    const shell = document.createElement("div");
    shell.style.width = "min(920px, 96vw)";
    shell.style.maxHeight = "92vh";
    shell.style.padding = "18px";
    shell.style.borderRadius = "24px";
    shell.style.background = "linear-gradient(160deg, #fff7ee, #f7e8ff)";
    shell.style.boxShadow = "0 28px 80px rgba(0, 0, 0, 0.45)";
    shell.style.display = "grid";
    shell.style.gap = "14px";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.gap = "12px";
    header.style.alignItems = "flex-start";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = "Mandala Overlay";
    title.style.margin = "0";
    title.style.fontFamily = "Georgia, serif";
    title.style.fontSize = "28px";
    title.style.color = "#34162f";

    const subtitle = document.createElement("p");
    subtitle.textContent = `${settings.symmetry}-fold symmetry active. Draw anywhere inside the canvas.`;
    subtitle.style.margin = "6px 0 0";
    subtitle.style.color = "#6c5872";
    subtitle.style.fontSize = "14px";

    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const closeBtn = makeButton("Close", "#4e3f5c", "#ffffff");
    closeBtn.addEventListener("click", () => overlay.remove());
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const canvasFrame = document.createElement("div");
    canvasFrame.style.background = "#ffffff";
    canvasFrame.style.borderRadius = "20px";
    canvasFrame.style.padding = "12px";
    canvasFrame.style.border = "1px solid rgba(87, 51, 76, 0.14)";

    const canvas = document.createElement("canvas");
    canvas.width = 880;
    canvas.height = 560;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "min(68vh, 560px)";
    canvas.style.borderRadius = "14px";
    canvas.style.cursor = "crosshair";
    canvas.style.touchAction = "none";
    canvasFrame.appendChild(canvas);

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "10px";

    const clearBtn = makeButton("Clear", "#fff1f1", "#a2354f");
    clearBtn.style.border = "1px solid rgba(162, 53, 79, 0.16)";
    const saveBtn = makeButton("Save PNG", "#ffe5b8", "#7a4310");
    const studioBtn = makeButton("Open Studio", "#e8e0ff", "#4a33af");

    controls.appendChild(clearBtn);
    controls.appendChild(saveBtn);
    controls.appendChild(studioBtn);

    shell.appendChild(header);
    shell.appendChild(canvasFrame);
    shell.appendChild(controls);
    overlay.appendChild(shell);
    document.body.appendChild(overlay);

    const ctx = canvas.getContext("2d");
    const symmetry = Math.max(2, parseInt(settings.symmetry, 10) || 6);
    const brushColor = settings.brushColor || "#ff6b6b";
    const brushSize = Math.max(1, parseInt(settings.brushSize, 10) || 10);
    const center = { x: canvas.width / 2, y: canvas.height / 2 };

    let isDrawing = false;
    let lastPoint = null;

    drawGuide();

    canvas.addEventListener("pointerdown", (event) => {
      isDrawing = true;
      lastPoint = getPoint(event);
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!isDrawing || !lastPoint) {
        return;
      }

      const nextPoint = getPoint(event);
      drawStrokeSet(lastPoint, nextPoint);
      lastPoint = nextPoint;
    });

    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);

    clearBtn.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGuide();
    });

    saveBtn.addEventListener("click", () => {
      const link = document.createElement("a");
      link.download = "mandala-overlay.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });

    studioBtn.addEventListener("click", () => {
      window.open(chrome.runtime.getURL("content/mandala-canvas.html"), "_blank");
    });

    function stopDrawing(event) {
      isDrawing = false;
      lastPoint = null;
      if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }

    function getPoint(event) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    }

    function drawGuide() {
      ctx.save();
      ctx.strokeStyle = "rgba(122, 81, 110, 0.14)";
      ctx.lineWidth = 1;
      for (let i = 0; i < symmetry; i += 1) {
        const angle = (Math.PI * 2 * i) / symmetry;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(
          center.x + Math.cos(angle) * canvas.height * 0.42,
          center.y + Math.sin(angle) * canvas.height * 0.42
        );
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(center.x, center.y, canvas.height * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawStrokeSet(from, to) {
      for (let i = 0; i < symmetry; i += 1) {
        const angle = (Math.PI * 2 * i) / symmetry;
        const start = rotatePoint(from, center, angle);
        const end = rotatePoint(to, center, angle);
        drawStroke(start, end);
      }
    }

    function drawStroke(from, to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    function rotatePoint(point, origin, angle) {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      return {
        x: origin.x + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: origin.y + dx * Math.sin(angle) + dy * Math.cos(angle)
      };
    }

    function makeButton(label, background, color) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.padding = "10px 14px";
      button.style.border = "0";
      button.style.borderRadius = "12px";
      button.style.background = background;
      button.style.color = color;
      button.style.font = '700 13px "Trebuchet MS", sans-serif';
      button.style.cursor = "pointer";
      return button;
    }
  }
});
