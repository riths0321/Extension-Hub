import { clearHistory, deleteHistoryItem, getHistory, getSettings, setDraftCapture } from "../modules/storage.js";
import { buildFilename } from "../modules/filename.js";
import { timeAgo } from "../modules/time.js";
import { showToast } from "../modules/toast.js";

function qs(id) {
  return document.getElementById(id);
}

function openPage(page) {
  chrome.tabs.create({ url: chrome.runtime.getURL(page) });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

async function tryCopyBlob(blob) {
  // eslint-disable-next-line no-undef
  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}

function makeItemEl(item, settings) {
  const el = document.createElement("div");
  el.className = "qs-item";
  el.innerHTML = `
    <div class="qs-thumb">${item.thumbUrl ? `<img alt="Screenshot thumbnail" src="${item.thumbUrl}">` : ""}</div>
    <div class="qs-item-bd">
      <div class="qs-meta">
        <span>${timeAgo(item.createdAt || Date.now())}</span>
        <span>${String(item.format || "png").toUpperCase()}</span>
      </div>
      <div class="qs-item-actions">
        <button class="qs-btn" data-act="open" type="button">Open</button>
        <button class="qs-btn" data-act="copy" type="button">Copy</button>
        <button class="qs-btn" data-act="download" type="button">Download</button>
        <button class="qs-btn qs-btn-danger" data-act="delete" type="button">Delete</button>
      </div>
    </div>
  `;

  el.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    try {
      if (act === "open") {
        await setDraftCapture({ dataUrl: item.dataUrl, cropRect: null, createdAt: item.createdAt || Date.now() });
        openPage("editor/editor.html");
      } else if (act === "copy") {
        const blob = await dataUrlToBlob(item.dataUrl);
        await tryCopyBlob(blob);
        showToast("Copied");
      } else if (act === "download") {
        const url = item.dataUrl;
        const filename = buildFilename(
          {
            format: item.format || settings.format,
            includeDate: !!settings.filenameIncludeDate,
            includeTime: !!settings.filenameIncludeTime
          },
          new Date(item.createdAt || Date.now())
        );
        await chrome.downloads.download({ url, filename, saveAs: false });
        showToast("Downloaded");
      } else if (act === "delete") {
        await deleteHistoryItem(item.id);
        el.remove();
        showToast("Deleted");
        if (!qs("grid").children.length) qs("empty").hidden = false;
      }
    } catch (e) {
      console.error(e);
      showToast("Action failed");
    }
  });

  return el;
}

async function main() {
  const settings = await getSettings();
  document.documentElement.dataset.theme = settings.theme === "dark" ? "dark" : "light";

  qs("btn-clear-all").addEventListener("click", async () => {
    await clearHistory();
    qs("grid").innerHTML = "";
    qs("empty").hidden = false;
    showToast("Cleared");
  });

  const history = await getHistory();
  const grid = qs("grid");
  grid.innerHTML = "";
  if (!history.length) {
    qs("empty").hidden = false;
    return;
  }
  qs("empty").hidden = true;
  history.forEach((item) => grid.appendChild(makeItemEl(item, settings)));
}

main().catch((e) => {
  console.error(e);
  showToast("History failed to load");
});
