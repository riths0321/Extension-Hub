const DEFAULT_SETTINGS = {
  symmetry: "6",
  brushSize: "10",
  brushColor: "#ff6b6b",
  backgroundColor: "#ffffff",
  showShadows: true,
  shadowColor: "#000000",
  shadowBlur: 10,
  canvasCenterX: 0.5,
  canvasCenterY: 0.5,
  enableMirroring: true,
  brushType: "round",
  randomColors: false
};

document.addEventListener("DOMContentLoaded", async () => {
  const fields = {
    symmetry: document.getElementById("symmetry"),
    brushSize: document.getElementById("brushSize"),
    brushColor: document.getElementById("brushColor"),
    backgroundColor: document.getElementById("backgroundColor"),
    showShadows: document.getElementById("showShadows"),
    shadowColor: document.getElementById("shadowColor"),
    shadowBlur: document.getElementById("shadowBlur"),
    canvasCenterX: document.getElementById("canvasCenterX"),
    canvasCenterY: document.getElementById("canvasCenterY"),
    enableMirroring: document.getElementById("enableMirroring"),
    brushType: document.getElementById("brushType"),
    randomColors: document.getElementById("randomColors")
  };

  const brushSizeValue = document.getElementById("brushSizeValue");
  const shadowBlurValue = document.getElementById("shadowBlurValue");
  const centerXValue = document.getElementById("centerXValue");
  const centerYValue = document.getElementById("centerYValue");
  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");
  const statusMessage = document.getElementById("statusMessage");
  const saveState = document.getElementById("saveState");

  const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  applySettings(settings);

  fields.brushSize.addEventListener("input", () => {
    brushSizeValue.textContent = `${fields.brushSize.value} px`;
  });

  fields.shadowBlur.addEventListener("input", () => {
    shadowBlurValue.textContent = fields.shadowBlur.value;
  });

  fields.canvasCenterX.addEventListener("input", () => {
    centerXValue.textContent = `${fields.canvasCenterX.value}%`;
  });

  fields.canvasCenterY.addEventListener("input", () => {
    centerYValue.textContent = `${fields.canvasCenterY.value}%`;
  });

  saveBtn.addEventListener("click", async () => {
    try {
      const payload = collectSettings();
      await chrome.storage.sync.set(payload);
      saveState.textContent = "Saved";
      setStatus("Settings saved.", "success");
    } catch (_error) {
      saveState.textContent = "Error";
      setStatus("Could not save settings.", "error");
    }
  });

  resetBtn.addEventListener("click", async () => {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
    saveState.textContent = "Reset";
    setStatus("Defaults restored.", "success");
  });

  function applySettings(settings) {
    fields.symmetry.value = String(settings.symmetry);
    fields.brushSize.value = String(settings.brushSize);
    fields.brushColor.value = settings.brushColor;
    fields.backgroundColor.value = settings.backgroundColor;
    fields.showShadows.checked = Boolean(settings.showShadows);
    fields.shadowColor.value = settings.shadowColor;
    fields.shadowBlur.value = String(settings.shadowBlur);
    fields.canvasCenterX.value = String(Math.round(Number(settings.canvasCenterX) * 100));
    fields.canvasCenterY.value = String(Math.round(Number(settings.canvasCenterY) * 100));
    fields.enableMirroring.checked = Boolean(settings.enableMirroring);
    fields.brushType.value = settings.brushType;
    fields.randomColors.checked = Boolean(settings.randomColors);

    brushSizeValue.textContent = `${fields.brushSize.value} px`;
    shadowBlurValue.textContent = fields.shadowBlur.value;
    centerXValue.textContent = `${fields.canvasCenterX.value}%`;
    centerYValue.textContent = `${fields.canvasCenterY.value}%`;
  }

  function collectSettings() {
    return {
      symmetry: fields.symmetry.value,
      brushSize: fields.brushSize.value,
      brushColor: fields.brushColor.value,
      backgroundColor: fields.backgroundColor.value,
      showShadows: fields.showShadows.checked,
      shadowColor: fields.shadowColor.value,
      shadowBlur: Number(fields.shadowBlur.value),
      canvasCenterX: Number(fields.canvasCenterX.value) / 100,
      canvasCenterY: Number(fields.canvasCenterY.value) / 100,
      enableMirroring: fields.enableMirroring.checked,
      brushType: fields.brushType.value,
      randomColors: fields.randomColors.checked
    };
  }

  function setStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status is-${type}`;
    window.setTimeout(() => {
      statusMessage.textContent = "";
      statusMessage.className = "status";
    }, 2400);
  }
});
