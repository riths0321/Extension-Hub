// QuickShot – Background Service Worker (MV3) - FIXED VERSION

const SETTINGS_KEY = "qs_settings";
const DRAFT_KEY = "qs_draft_capture_v1";
const FULL_LIMIT_SEGMENTS = 20;
const FULL_MIN_SCROLL_DELAY_MS = 120;

function isRestrictedPage(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.includes("chrome.google.com/webstore")
  );
}

async function getActiveTab() {
  // Prefer capturing from a normal web tab.
  // If the active tab is an extension page, fall back to a non-extension tab in the same window.
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!active) return null;

  if (!isRestrictedPage(active.url)) return active;

  const all = await chrome.tabs.query({ currentWindow: true });
  return all.find((t) => !isRestrictedPage(t.url)) || active;
}

async function getFormat() {
  const result = await chrome.storage.local.get([SETTINGS_KEY]);
  const fmt = result?.[SETTINGS_KEY]?.format;
  return String(fmt || "png").toLowerCase() === "jpg" ? "jpeg" : "png";
}

async function setDraftCapture({ dataUrl, cropRect }) {
  await chrome.storage.local.set({
    [DRAFT_KEY]: {
      mode: "single",
      dataUrl: dataUrl,
      cropRect: cropRect || null,
      createdAt: Date.now()
    }
  });
}

async function setDraftFullCapture({ captures, dims }) {
  await chrome.storage.local.set({
    [DRAFT_KEY]: {
      mode: "full",
      captures: captures,
      dims: dims,
      createdAt: Date.now()
    }
  });
}

async function openQuickShotUI() {
  try {
    await chrome.action.openPopup();
    return;
  } catch {
    // Fallback: open editor page
  }
  const url = chrome.runtime.getURL("editor.html");
  await chrome.tabs.create({ url });
}

async function openCapturedPage() {
  const url = chrome.runtime.getURL("capture/captured.html");
  const tab = await chrome.tabs.create({ url });

  // Wait for tab to load completely
  return new Promise((resolve) => {
    const listener = (tabId, info) => {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// FIXED: captureVisibleTab function
async function captureVisibleTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(tabId, { format: "png" }, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// FIXED: captureVisibleToDraft - properly saves single image
async function captureVisibleToDraft() {
  try {
    const tab = await getActiveTab();
    if (!tab || isRestrictedPage(tab.url)) {
      throw new Error("This page cannot be captured.");
    }

    const format = await getFormat();
    const dataUrl = await captureVisibleTab(tab.windowId, format);

    // Save as single capture properly
    await setDraftCapture({
      dataUrl: dataUrl,
      cropRect: null
    });

    // Update badge
    chrome.action.setBadgeText({ text: "1" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

    return dataUrl;
  } catch (e) {
    console.error("Capture failed:", e);
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
    throw e;
  }
}

// FIXED: captureFullPageToDraft - properly saves full page capture
async function captureFullPageToDraft() {
  const tab = await getActiveTab();
  if (!tab || isRestrictedPage(tab.url)) {
    throw new Error("This page cannot be captured.");
  }

  // Get page dimensions
  const [{ result: dims }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollHeight = Math.max(
        doc.scrollHeight,
        body?.scrollHeight || 0,
        doc.offsetHeight,
        body?.offsetHeight || 0
      );
      const scrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth || 0, doc.offsetWidth, body?.offsetWidth || 0);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      return {
        width: scrollWidth,
        height: scrollHeight,
        viewportWidth,
        viewportHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        scrollX: window.scrollX || window.pageXOffset || 0,
        scrollY: window.scrollY || window.pageYOffset || 0
      };
    }
  });

  const steps = Math.ceil(dims.height / dims.viewportHeight);
  const maxSteps = Math.min(steps, FULL_LIMIT_SEGMENTS);
  if (maxSteps < steps) {
    dims.height = maxSteps * dims.viewportHeight;
  }

  const format = await getFormat();
  const captures = [];

  // Capture each segment
  for (let i = 0; i < maxSteps; i += 1) {
    const y = i * dims.viewportHeight;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (yy) => window.scrollTo(0, yy),
      args: [y]
    });

    await new Promise((r) => setTimeout(r, FULL_MIN_SCROLL_DELAY_MS));

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format });
    captures.push({ y, dataUrl });
  }

  // Restore scroll position
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (x, y) => window.scrollTo(x, y),
    args: [dims.scrollX, dims.scrollY]
  });

  // Save full page capture
  await setDraftFullCapture({ captures, dims });
  
  // Update badge
  chrome.action.setBadgeText({ text: maxSteps.toString() });
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
}

async function startAreaSelection() {
  const tab = await getActiveTab();
  if (!tab || isRestrictedPage(tab.url)) {
    throw new Error("Area selection not allowed on this page.");
  }

  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["content.css"]
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });

  await new Promise((r) => setTimeout(r, 80));
  await chrome.tabs.sendMessage(tab.id, { action: "QS_START_SELECTION" });
}

// FIXED: captureSelectionToDraft - properly saves selected area
async function captureSelectionToDraft(coords) {
  const tab = await getActiveTab();
  if (!tab || isRestrictedPage(tab.url)) {
    throw new Error("This page cannot be captured.");
  }

  const format = await getFormat();
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format });
  await setDraftCapture({ dataUrl, cropRect: coords || null });
  
  // Update badge
  chrome.action.setBadgeText({ text: "1" });
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
}

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === "capture_visible") {
      await captureVisibleToDraft();
      await openCapturedPage();
    }
    if (command === "capture_selection") {
      await startAreaSelection();
    }
  } catch (e) {
    console.error("Command error:", e);
  }
});

// FIXED: Message listener with proper responses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request?.action === "QS_CAPTURE_VISIBLE") {
        await captureVisibleToDraft();
        await openCapturedPage();
        sendResponse({ status: "ok", message: "Visible capture saved" });
        return;
      }

      if (request?.action === "QS_CAPTURE_FULL") {
        await captureFullPageToDraft();
        await openCapturedPage();
        sendResponse({ status: "ok", message: "Full page capture saved" });
        return;
      }

      if (request?.action === "QS_START_AREA_CAPTURE") {
        await startAreaSelection();
        sendResponse({ status: "ok", message: "Area selection started" });
        return;
      }

      if (request?.action === "selection_completed") {
        await captureSelectionToDraft(request.coords);
        await openCapturedPage();
        sendResponse({ status: "ok", message: "Selection captured" });
        return;
      }

      // Backward compatibility
      if (request?.action === "capture_visible") {
        await captureVisibleToDraft();
        await openQuickShotUI();
        sendResponse({ status: "ok" });
        return;
      }
      
      if (request?.action === "capture_selection") {
        await startAreaSelection();
        sendResponse({ status: "ok" });
        return;
      }

      // Handle PDF download request from captured page
      if (request?.action === "DOWNLOAD_AS_PDF") {
        const { imageDataUrl, filename } = request;
        
        // Convert base64 to blob
        const base64Data = imageDataUrl.split(',')[1];
        const blob = await fetch(imageDataUrl).then(res => res.blob());
        
        // Create PDF (you'll need to implement this or use a library)
        // For now, download as image
        const downloadUrl = URL.createObjectURL(blob);
        
        await chrome.downloads.download({
          url: downloadUrl,
          filename: filename || `quickshot-${Date.now()}.png`,
          conflictAction: "uniquify"
        });
        
        URL.revokeObjectURL(downloadUrl);
        sendResponse({ status: "ok", message: "File downloaded" });
        return;
      }

      sendResponse({ status: "error", message: "Unknown action" });
    } catch (e) {
      console.error("Message handler error:", e);
      sendResponse({ status: "error", message: e?.message || "Failed to process request" });
    }
  })();
  return true; // Keep message channel open for async response
});

// Clear badge when tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.storage.local.get([DRAFT_KEY], (result) => {
    const draft = result[DRAFT_KEY];
    if (draft) {
      if (draft.mode === "single") {
        chrome.action.setBadgeText({ text: "1" });
      } else if (draft.mode === "full" && draft.captures) {
        chrome.action.setBadgeText({ text: draft.captures.length.toString() });
      }
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
});

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get([SETTINGS_KEY]);
  if (!result?.[SETTINGS_KEY]) {
    await chrome.storage.local.set({
      [SETTINGS_KEY]: {
        format: "png",
        autoCopy: false,
        filenameIncludeDate: true,
        filenameIncludeTime: true,
        theme: "light",
        jpgQuality: 0.92
      }
    });
  }
  chrome.action.setBadgeText({ text: "" });
});