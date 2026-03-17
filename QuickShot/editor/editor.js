import { QuickShotCanvasEditor } from "../modules/canvasEditor.js";
import { buildFilename } from "../modules/filename.js";
import { addHistoryItem, getDraftCapture, getSettings } from "../modules/storage.js";
import { showToast } from "../modules/toast.js";

function qs(id) {
  return document.getElementById(id);
}

function openPage(page) {
  chrome.tabs.create({ url: chrome.runtime.getURL(page) });
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Failed to read blob"));
    r.readAsDataURL(blob);
  });
}

async function makeThumbnailDataUrl(dataUrl) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });
  const maxW = 520;
  const maxH = 320;
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { alpha: false });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.82);
}

async function tryCopyBlob(blob) {
  // eslint-disable-next-line no-undef
  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

function setToolPressed(container, tool) {
  container.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.dataset.tool === tool ? "true" : "false");
  });
}

async function main() {
  const settings = await getSettings();
  document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";

  const editorCanvas = qs("editor-canvas");
  const tools = qs("tools");
  const editor = new QuickShotCanvasEditor(editorCanvas, { maxDim: 2400 });

  const textBackdrop = qs("text-backdrop");
  const textValue = qs("text-value");
  const textSize = qs("text-size");
  const textOpacity = qs("text-opacity");

  function openTextModal() {
    textBackdrop.dataset.open = "true";
    textBackdrop.setAttribute("aria-hidden", "false");
    textValue.value = "";
    textSize.value = "22";
    textOpacity.value = "100";
    setTimeout(() => textValue.focus(), 0);
  }

  function closeTextModal() {
    textBackdrop.dataset.open = "false";
    textBackdrop.setAttribute("aria-hidden", "true");
  }

  editor.attachPointerHandlers({
    onTextRequested: () => openTextModal()
  });

  tools.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-tool]");
    if (!btn) return;
    const tool = btn.dataset.tool;
    editor.setTool(tool);
    setToolPressed(tools, tool);
    showToast(tool === "crop" ? "Drag to crop" : `${tool[0].toUpperCase()}${tool.slice(1)} tool`);
  });

  qs("color").addEventListener("input", (e) => editor.setColor(e.target.value));
  qs("brush").addEventListener("input", (e) => editor.setBrushSize(e.target.value));
  qs("opacity").addEventListener("input", (e) => editor.setOpacity(Number(e.target.value) / 100));

  qs("btn-undo").addEventListener("click", () => editor.undo());
  qs("btn-redo").addEventListener("click", () => editor.redo());
  qs("btn-clear").addEventListener("click", () => editor.clearCanvas());
  qs("btn-reset").addEventListener("click", async () => {
    await editor.resetToBase();
    showToast("Reset");
  });

  qs("btn-history").addEventListener("click", () => openPage("history/history.html"));
  qs("btn-options").addEventListener("click", () => openPage("option/options.html"));

  // text modal
  qs("text-close").addEventListener("click", () => closeTextModal());
  qs("text-cancel").addEventListener("click", () => closeTextModal());
  textBackdrop.addEventListener("mousedown", (e) => {
    if (e.target === textBackdrop) closeTextModal();
  });
  qs("text-apply").addEventListener("click", async () => {
    const size = Number(textSize.value || 22);
    const forcedOpacity = Number(textOpacity.value || 100) / 100;
    editor.setOpacity(forcedOpacity);
    await editor.addText({ text: textValue.value.trim(), size, font: "Manrope" });
    closeTextModal();
    showToast("Text added");
  });

  async function loadDraft() {
    const draft = await getDraftCapture();
    if (!draft) {
      qs("status").textContent = "Capture a screen to begin";
      return;
    }
    if (draft.mode === "full") {
      await editor.loadFromSegments(draft.captures, draft.dims);
      qs("status").textContent = "Full page loaded";
      return;
    }
    if (!draft.dataUrl) {
      qs("status").textContent = "Capture a screen to begin";
      return;
    }
    await editor.loadFromDataUrl(draft.dataUrl, draft.cropRect || null);
  }

  async function exportAndStore({ mode }) {
    const blob = await editor.exportBlob({ format: settings.format, jpgQuality: settings.jpgQuality });
    const filename = buildFilename({
      format: settings.format,
      includeDate: !!settings.filenameIncludeDate,
      includeTime: !!settings.filenameIncludeTime
    });

    if (mode === "copy") {
      await tryCopyBlob(blob);
      showToast("Copied");
    } else {
      const url = URL.createObjectURL(blob);
      await chrome.downloads.download({ url, filename, saveAs: false });
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
      showToast("Downloaded");
    }

    const dataUrl = await blobToDataUrl(blob);
    const thumbUrl = await makeThumbnailDataUrl(dataUrl);
    await addHistoryItem({
      id: `qs_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      format: settings.format,
      dataUrl,
      thumbUrl
    });
  }

  qs("btn-copy").addEventListener("click", () => exportAndStore({ mode: "copy" }).catch(() => showToast("Copy failed")));
  qs("btn-download").addEventListener("click", () => exportAndStore({ mode: "download" }).catch(() => showToast("Download failed")));

  await loadDraft();
}

main().catch((e) => {
  console.error(e);
  showToast("Editor failed to load");
});
