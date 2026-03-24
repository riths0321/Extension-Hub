import { QuickShotCanvasEditor } from "../modules/canvasEditor.js";
import { buildFilename } from "../modules/filename.js";
import { addHistoryItem, getDraftCapture, getSettings } from "../modules/storage.js";
import { showToast } from "../modules/toast.js";

// ❌ NO import jsPDF - direct global use karenge

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
  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

async function main() {
  const settings = await getSettings();
  document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";

  qs("btn-history").addEventListener("click", () => openPage("history/history.html"));
  qs("btn-options").addEventListener("click", () => openPage("option/options.html"));
  qs("btn-edit").addEventListener("click", () => openPage("editor/editor.html"));

  const canvas = qs("preview-canvas");
  const editor = new QuickShotCanvasEditor(canvas, { maxDim: 3200 });
  const draft = await getDraftCapture();
  
  if (!draft) {
    qs("status").textContent = "No capture found. Use QuickShot to capture first.";
    return;
  }

  try {
    if (draft.mode === "full") {
      await editor.loadFromSegments(draft.captures, draft.dims);
      qs("meta").textContent = "Full page screenshot (stitched)";
    } else if (draft.dataUrl) {
      await editor.loadFromDataUrl(draft.dataUrl, draft.cropRect || null);
      qs("meta").textContent = "Screenshot";
    } else {
      qs("status").textContent = "No capture data found.";
      return;
    }
  } catch (e) {
    console.error(e);
    qs("status").textContent = "Failed to render capture.";
    return;
  }

  async function exportAndStore({ mode }) {
    const blob = await editor.exportBlob({ format: settings.format, jpgQuality: settings.jpgQuality });
    const filename = buildFilename(
      {
        format: settings.format,
        includeDate: !!settings.filenameIncludeDate,
        includeTime: !!settings.filenameIncludeTime
      },
      new Date(draft.createdAt || Date.now())
    );

    if (mode === "copy") {
      await tryCopyBlob(blob);
      showToast("Copied");
    } else if (mode === "download") {
      const url = URL.createObjectURL(blob);
      await chrome.downloads.download({ url, filename, saveAs: false });
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
      showToast("Downloaded");
    } else if (mode === "print") {
      const url = URL.createObjectURL(blob);
      const w = window.open("", "_blank");
      if (!w) throw new Error("Popup blocked");
      w.document.write(`<title>${filename}</title><img src="${url}" style="max-width:100%;height:auto;"/>`);
      w.document.close();
      w.focus();
      w.print();
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
      showToast("Print dialog opened");
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

  // Save Image button
  qs("btn-save-image").addEventListener("click", async () => {
    try {
      const hasPermission = await chrome.permissions.contains({ permissions: ["downloads"] });
      
      if (!hasPermission) {
        const granted = await chrome.permissions.request({ permissions: ["downloads"] });
        if (!granted) {
          showToast("Permission denied");
          return;
        }
      }
      
      await exportAndStore({ mode: "download" });
    } catch (error) {
      console.error("Save failed:", error);
      showToast("Save failed");
    }
  });
  
  // Email button
  qs("btn-email").addEventListener("click", async () => {
    try {
      const blob = await editor.exportBlob({ format: 'png' });
      const subject = encodeURIComponent("Screenshot from QuickShot");
      const body = encodeURIComponent("Here's a screenshot captured with QuickShot");
      
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, "_blank");
      await tryCopyBlob(blob);
      showToast("Image copied - Paste in email");
    } catch (e) {
      console.error(e);
      showToast("Failed to open email");
    }
  });
  
  // Copy button
  qs("btn-copy").addEventListener("click", () => 
    exportAndStore({ mode: "copy" }).catch(() => showToast("Copy failed"))
  );
  
  // Print button
  qs("btn-print").addEventListener("click", async () => {
    try {
      const blob = await editor.exportBlob({ format: 'png' });
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Screenshot</title>
          <style>
            body { margin: 0; padding: 20px; background: #fff; text-align: center; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { padding: 0; }
              img { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <img src="${url}" />
        </body>
        </html>
      `);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => printWindow.close(), 1000);
        }, 500);
      };
      
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      showToast("Opening print dialog");
    } catch (e) {
      console.error(e);
      showToast("Print failed");
    }
  });
}

// Start the app
main().catch((e) => {
  console.error(e);
  showToast("Captured page failed to load");
});