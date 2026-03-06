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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(DEFAULT_SETTINGS);
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "openMandalaCanvas",
      title: "Open Mandala Canvas",
      contexts: ["page"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "openMandalaCanvas") {
    return;
  }

  chrome.tabs.create({
    url: chrome.runtime.getURL("content/mandala-canvas.html"),
    active: true
  });
});
