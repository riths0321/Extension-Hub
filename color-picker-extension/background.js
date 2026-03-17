function chromeCall(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function getActiveTab() {
  const tabs = await chromeCall(chrome.tabs.query, { active: true, currentWindow: true });
  return tabs && tabs[0] ? tabs[0] : null;
}

async function sendToTab(tabId, message) {
  return chromeCall(chrome.tabs.sendMessage, tabId, message);
}

async function captureVisible(windowId) {
  return chromeCall(chrome.tabs.captureVisibleTab, windowId, { format: "png" });
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, n | 0));
}

function rgbToHex(r, g, b) {
  const rr = clampInt(Math.round(r), 0, 255).toString(16).padStart(2, "0");
  const gg = clampInt(Math.round(g), 0, 255).toString(16).padStart(2, "0");
  const bb = clampInt(Math.round(b), 0, 255).toString(16).padStart(2, "0");
  return ("#" + rr + gg + bb).toUpperCase();
}

async function hexFromScreenshot(dataUrl, point) {
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);

  const scaleX = bitmap.width / point.viewportWidth;
  const scaleY = bitmap.height / point.viewportHeight;
  const px = clampInt(Math.round(point.x * scaleX), 0, bitmap.width - 1);
  const py = clampInt(Math.round(point.y * scaleY), 0, bitmap.height - 1);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(bitmap, 0, 0);
  const d = ctx.getImageData(px, py, 1, 1).data;
  return rgbToHex(d[0], d[1], d[2]);
}

async function savePicked(hex) {
  const state = await chromeCall(chrome.storage.local.get, { colors: [], lastPicked: null });
  let colors = Array.isArray(state.colors) ? state.colors : [];
  colors = colors.filter((c) => c !== hex);
  colors.unshift(hex);
  if (colors.length > 24) colors = colors.slice(0, 24);
  await chromeCall(chrome.storage.local.set, { colors, lastPicked: hex });
}

async function startFallbackPick() {
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") throw new Error("No active tab");

  const point = await sendToTab(tab.id, { type: "PP_PICK_PIXEL" });
  if (!point || point.canceled) return { canceled: true };

  const dataUrl = await captureVisible(tab.windowId);
  const hex = await hexFromScreenshot(dataUrl, point);
  await savePicked(hex);
  return { canceled: false, hex };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "PP_FALLBACK_START") return;
  startFallbackPick()
    .then((res) => sendResponse({ ok: true, ...res }))
    .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
  return true;
});

chrome.omnibox.onInputEntered.addListener((_text) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
});
