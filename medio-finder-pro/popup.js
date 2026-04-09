// DOM Elements
const scanBtn = document.getElementById("scanBtn");
const downloadAllBtn = document.getElementById("downloadAll");
const itemsContainer = document.getElementById("items");
const statusEl = document.getElementById("status");
const itemCountEl = document.getElementById("itemCount");
const filterSvg = document.getElementById("filterSvg");
const filterImg = document.getElementById("filterImg");
const filterMp4 = document.getElementById("filterMp4");
const filterWebm = document.getElementById("filterWebm");
const filterOther = document.getElementById("filterOther");
const downloadFormat = document.getElementById("downloadFormat");
const videoDownloadFormat = document.getElementById("videoDownloadFormat");
const highQuality = document.getElementById("highQuality");
const formatSelector = document.getElementById("formatSelector");
const imageFormatSelector = document.getElementById("imageFormatSelector");
const videoFormatSelector = document.getElementById("videoFormatSelector");
const qualityToggle = document.getElementById("qualityToggle");

// Preview Modal Elements
const previewModal = document.getElementById("previewModal");
const previewTitle = document.getElementById("previewTitle");
const previewBody = document.getElementById("previewBody");
const previewDownloadBtn = document.getElementById("previewDownloadBtn");
const previewCloseBtn = document.getElementById("previewCloseBtn");
const closePreviewBtn = document.querySelector(".close-preview");

// Tab elements
const tabBtns = document.querySelectorAll(".tab-btn");
const imageFilters = document.getElementById("imageFilters");
const videoFilters = document.getElementById("videoFilters");

// Data storage
let allIcons = [];
let allVideos = [];
let currentTab = "images";
let currentItems = [];
let currentPreviewItem = null;

const PDF_TEXT_ENCODER = new TextEncoder();
const HIDDEN_CLASS = "is-hidden";
const LOADING_CLASS = "is-loading";

function isSvgItem(item) {
  return item?.type === "svg" || item?.ext?.toLowerCase() === "svg";
}

function isRasterImageItem(item) {
  return item?.type === "image" && !isSvgItem(item);
}

function isVideoItem(item) {
  return item?.type === "video" || Array.isArray(item?.sources) || Boolean(item?.format && item?.url);
}

function getSelectedImageFormat() {
  return downloadFormat?.value || "original";
}

function getSelectedVideoFormat() {
  return videoDownloadFormat?.value || "original";
}

function getExportQuality() {
  return highQuality?.checked ? 1 : 0.8;
}

function needsOpaqueBackground(format) {
  return format === "jpg" || format === "pdf";
}

function getScanSummaryText() {
  return `✅ Found ${allIcons.length} images/icons and ${allVideos.length} videos`;
}

function setHidden(element, hidden) {
  if (!element) return;
  element.classList.toggle(HIDDEN_CLASS, hidden);
}

function clearNode(element) {
  if (!element) return;
  element.replaceChildren();
}

function createEmptyState(icon, message) {
  const container = document.createElement("div");
  container.className = "empty-state";

  const iconNode = document.createElement("span");
  iconNode.textContent = icon;

  const messageNode = document.createElement("div");
  messageNode.textContent = message;

  container.appendChild(iconNode);
  container.appendChild(messageNode);
  return container;
}

function renderEmptyState(container, icon, message) {
  clearNode(container);
  container.appendChild(createEmptyState(icon, message));
}

function createMediaEmoji(emoji) {
  const node = document.createElement("div");
  node.className = "media-emoji";
  node.textContent = emoji;
  return node;
}

function createActionLabel(label) {
  const span = document.createElement("span");
  span.className = "action-btn__label";
  span.textContent = label;
  return span;
}

function createSvgPreviewImage(svgMarkup) {
  const img = document.createElement("img");
  img.alt = "SVG preview";

  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);
  const cleanup = () => URL.revokeObjectURL(objectUrl);

  img.addEventListener("load", cleanup, { once: true });
  img.addEventListener("error", cleanup, { once: true });
  img.src = objectUrl;

  return img;
}

function refreshCurrentView() {
  if (currentTab === "images") {
    renderImages();
  } else if (currentTab === "videos") {
    renderVideos();
  } else {
    renderAll();
  }
}

function updateFormatControls() {
  const showImageControls = currentTab !== "videos";
  const showVideoControls = currentTab !== "images";

  setHidden(formatSelector, !(showImageControls || showVideoControls));
  setHidden(imageFormatSelector, !showImageControls);
  setHidden(videoFormatSelector, !showVideoControls);
  setHidden(qualityToggle, !showImageControls);
}

/* -------------------- PREVIEW MODAL -------------------- */
function showPreview(item) {
  currentPreviewItem = item;
  previewTitle.textContent = `${isVideoItem(item) ? "Video" : isSvgItem(item) ? "SVG Icon" : "Image"} Preview`;
  clearNode(previewBody);

  if (isSvgItem(item)) {
    const img = createSvgPreviewImage(item.content);
    img.addEventListener("error", () => renderEmptyState(previewBody, "⚠️", "Unable to preview SVG"), {
      once: true
    });
    previewBody.appendChild(img);
    previewModal.classList.add("active");
    return;
  }

  if (isRasterImageItem(item)) {
    const img = document.createElement("img");
    img.src = getImageSourceUrl(item);
    img.onerror = () => {
      renderEmptyState(previewBody, "⚠️", "Failed to load image");
    };
    previewBody.appendChild(img);
    previewModal.classList.add("active");
    return;
  }

  if (isVideoItem(item)) {
    const video = document.createElement("video");
    video.src = item.url;
    video.controls = true;
    video.autoplay = false;
    previewBody.appendChild(video);
  }

  previewModal.classList.add("active");
}

function closePreview() {
  previewModal.classList.remove("active");
  clearNode(previewBody);
  currentPreviewItem = null;
}

previewDownloadBtn.addEventListener("click", async () => {
  if (!currentPreviewItem) return;

  const didStartDownload = await downloadItem(currentPreviewItem);
  if (didStartDownload) {
    closePreview();
  }
});

previewCloseBtn.addEventListener("click", closePreview);
closePreviewBtn.addEventListener("click", closePreview);
previewModal.addEventListener("click", (event) => {
  if (event.target === previewModal) {
    closePreview();
  }
});

/* -------------------- TAB SWITCHING -------------------- */
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((tabBtn) => tabBtn.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;

    if (currentTab === "images") {
      setHidden(imageFilters, false);
      setHidden(videoFilters, true);
    } else if (currentTab === "videos") {
      setHidden(imageFilters, true);
      setHidden(videoFilters, false);
    } else {
      setHidden(imageFilters, false);
      setHidden(videoFilters, false);
    }

    updateFormatControls();
    refreshCurrentView();
  });
});

updateFormatControls();

/* -------------------- SCAN PAGE -------------------- */
scanBtn.addEventListener("click", async () => {
  setLoading(true, "🔍 Scanning page for media...");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setLoading(false, "❌ No active tab found");
    return;
  }

  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("edge://") ||
    tab.url.startsWith("about:")
  ) {
    setLoading(false, "❌ Cannot scan browser system pages");
    return;
  }

  const timeout = setTimeout(() => {
    setLoading(false, "⏱️ Scan timed out - try refreshing the page");
  }, 8000);

  chrome.tabs.sendMessage(tab.id, { type: "SCAN_MEDIA" }, (response) => {
    clearTimeout(timeout);

    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message);
      setLoading(false, "⚠️ Connection failed. Please refresh the page and try again.");
      return;
    }

    if (!response || (!response.icons && !response.videos)) {
      setLoading(false, "😕 No media found on this page");
      return;
    }

    allIcons = response.icons || [];
    allVideos = response.videos || [];
    refreshCurrentView();

    const total = allIcons.length + allVideos.length;
    setLoading(false, getScanSummaryText());
    downloadAllBtn.disabled = total === 0;
  });
});

/* -------------------- RENDER FUNCTIONS -------------------- */
function renderImages() {
  const filtered = allIcons.filter((icon) => {
    return (isSvgItem(icon) && filterSvg.checked) || (isRasterImageItem(icon) && filterImg.checked);
  });

  currentItems = filtered;
  itemCountEl.textContent = `${filtered.length} images`;
  renderMediaGrid(filtered);
}

function matchesVideoFilters(video) {
  const format = String(video.format || "").toLowerCase();

  if (filterMp4.checked && format === "mp4") return true;
  if (filterWebm.checked && format === "webm") return true;
  if (filterOther.checked && !["mp4", "webm"].includes(format)) return true;

  return false;
}

function renderVideos() {
  const filtered = allVideos.filter(matchesVideoFilters);

  currentItems = filtered;
  itemCountEl.textContent = `${filtered.length} videos`;
  renderMediaGrid(filtered);
}

function renderAll() {
  const filteredImages = allIcons.filter((icon) => {
    return (isSvgItem(icon) && filterSvg.checked) || (isRasterImageItem(icon) && filterImg.checked);
  });

  const filteredVideos = allVideos.filter(matchesVideoFilters);
  currentItems = [...filteredImages, ...filteredVideos];
  itemCountEl.textContent = `${filteredImages.length} images, ${filteredVideos.length} videos`;
  renderMediaGrid(currentItems);
}

function renderMediaGrid(items) {
  clearNode(itemsContainer);

  if (items.length === 0) {
    itemsContainer.appendChild(createEmptyState("🖼️", "No items to display"));
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "media-card";

    const previewContainer = document.createElement("div");
    previewContainer.className = "preview-container";

    if (isSvgItem(item)) {
      const svgPreview = createSvgPreviewImage(item.content);
      svgPreview.addEventListener(
        "error",
        () => {
          clearNode(previewContainer);
          previewContainer.appendChild(createMediaEmoji("🎨"));
        },
        { once: true }
      );
      previewContainer.appendChild(svgPreview);
    } else if (isRasterImageItem(item)) {
      const img = document.createElement("img");
      img.src = getImageSourceUrl(item);
      img.loading = "lazy";
      img.onerror = () => {
        img.classList.add(HIDDEN_CLASS);
        previewContainer.appendChild(createMediaEmoji("🖼️"));
      };
      previewContainer.appendChild(img);
    } else if (isVideoItem(item)) {
      const video = document.createElement("video");
      video.src = item.url;
      video.muted = true;
      video.preload = "metadata";
      video.onmouseenter = () => {
        const playPromise = video.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {});
        }
      };
      video.onmouseleave = () => {
        video.pause();
        video.currentTime = 0;
      };
      previewContainer.appendChild(video);

      const videoBadge = document.createElement("div");
      videoBadge.className = "video-badge";
      videoBadge.textContent = "🎥";
      card.appendChild(videoBadge);

      const formatBadge = document.createElement("div");
      formatBadge.className = "format-badge";
      formatBadge.textContent = String(item.format || "video").toUpperCase();
      card.appendChild(formatBadge);
    }

    card.appendChild(previewContainer);

    const infoSection = document.createElement("div");
    infoSection.className = "item-info";

    const typeSpan = document.createElement("span");
    typeSpan.className = "item-type";
    if (isSvgItem(item)) {
      typeSpan.textContent = "SVG";
    } else if (isRasterImageItem(item)) {
      typeSpan.textContent = item.ext?.toUpperCase() || "IMG";
    } else {
      typeSpan.textContent = item.format?.toUpperCase() || "VIDEO";
    }

    const sizeSpan = document.createElement("span");
    sizeSpan.className = "item-size";
    const shortName = item.name?.substring(0, 15) || "file";
    sizeSpan.textContent = shortName.length > 12 ? `${shortName.substring(0, 10)}...` : shortName;

    infoSection.appendChild(typeSpan);
    infoSection.appendChild(sizeSpan);
    card.appendChild(infoSection);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const previewBtn = document.createElement("button");
    previewBtn.className = "action-btn";
    previewBtn.appendChild(createActionLabel("👁️"));
    previewBtn.title = "Preview";
    previewBtn.onclick = (event) => {
      event.stopPropagation();
      showPreview(item);
    };

    const dlBtn = document.createElement("button");
    dlBtn.className = "action-btn";
    dlBtn.appendChild(createActionLabel("⬇️"));
    dlBtn.title = "Download";
    dlBtn.onclick = async (event) => {
      event.stopPropagation();
      await downloadItem(item);
    };

    const cpBtn = document.createElement("button");
    cpBtn.className = "action-btn";
    cpBtn.appendChild(createActionLabel("📋"));
    cpBtn.title = "Copy URL";
    cpBtn.onclick = async (event) => {
      event.stopPropagation();
      await copyToClipboard(item);
    };

    actions.appendChild(previewBtn);
    actions.appendChild(cpBtn);
    actions.appendChild(dlBtn);
    card.appendChild(actions);

    card.addEventListener("click", () => showPreview(item));
    itemsContainer.appendChild(card);
  });
}

/* -------------------- DOWNLOAD FUNCTIONS -------------------- */
async function downloadItem(item) {
  try {
    if (isVideoItem(item)) {
      return await downloadVideoItem(item, getSelectedVideoFormat());
    }

    return await downloadWithFormat(item, getSelectedImageFormat());
  } catch (error) {
    console.error("Download error:", error);
    statusEl.textContent = `❌ Failed: ${error.message}`;
    return false;
  }
}

async function downloadVideoItem(item, requestedFormat) {
  const source = resolveVideoSource(item, requestedFormat);
  if (!source) {
    const availableFormats = getAvailableVideoFormats(item);
    throw new Error(
      `${requestedFormat.toUpperCase()} source not available${availableFormats ? `. Available: ${availableFormats}` : ""}`
    );
  }

  const targetFormat = source.format || item.format || getFileExtension(source.url, "mp4");
  const fallbackName = `video-${Date.now()}.${targetFormat}`;
  const filename =
    requestedFormat === "original" && item.name
      ? sanitizeFilename(item.name)
      : replaceFileExtension(item.name || fallbackName, targetFormat);

  statusEl.textContent =
    requestedFormat === "original"
      ? `📥 Downloading: ${filename}`
      : `📥 Downloading ${targetFormat.toUpperCase()}: ${filename}`;

  await startDownload({ url: source.url, filename });
  statusEl.textContent = `✅ Download started: ${filename}`;
  return true;
}

async function downloadWithFormat(item, format) {
  if (item.type === "svg") {
    return downloadSvgItem(item, format);
  }

  if (item.type === "image") {
    return downloadRasterImageItem(item, format);
  }

  throw new Error("Unsupported media type");
}

async function downloadSvgItem(item, format) {
  if (format === "original") {
    const blob = new Blob([item.content], { type: "image/svg+xml;charset=utf-8" });
    const filename = ensureFilename(item.name || `icon-${Date.now()}.svg`, "svg");
    await downloadBlob(blob, filename);
    statusEl.textContent = `✅ Download started: ${filename}`;
    return true;
  }

  statusEl.textContent = `🔄 Converting to ${format.toUpperCase()}...`;
  const blob = await convertSvgToFormat(item.content, format);
  const filename = replaceFileExtension(item.name || `icon-${Date.now()}.svg`, format);
  await downloadBlob(blob, filename);
  statusEl.textContent = `✅ Download started: ${filename}`;
  return true;
}

async function downloadRasterImageItem(item, format) {
  const fallbackExt = item.ext || getFileExtension(item.url || item.content || "", "png");
  const originalFilename = ensureFilename(item.name || `image-${Date.now()}.${fallbackExt}`, fallbackExt);

  if (format === "original") {
    statusEl.textContent = `📥 Downloading: ${originalFilename}`;
    await downloadOriginalImage(item, originalFilename);
    statusEl.textContent = `✅ Download started: ${originalFilename}`;
    return true;
  }

  statusEl.textContent = `🔄 Converting to ${format.toUpperCase()}...`;
  const { image, cleanup } = await loadImageForConversion(item);

  try {
    const blob = await convertImageToFormat(image, format);
    const filename = replaceFileExtension(originalFilename, format);
    await downloadBlob(blob, filename);
    statusEl.textContent = `✅ Download started: ${filename}`;
    return true;
  } finally {
    cleanup();
  }
}

async function downloadOriginalImage(item, filename) {
  const sourceUrl = getImageSourceUrl(item);
  if (!sourceUrl) {
    throw new Error("Image source unavailable");
  }

  try {
    await startDownload({ url: sourceUrl, filename });
  } catch (error) {
    if (sourceUrl.startsWith("http") || sourceUrl.startsWith("data:")) {
      const blob = await fetchMediaBlob(sourceUrl);
      await downloadBlob(blob, filename);
      return;
    }

    throw error;
  }
}

async function convertSvgToFormat(svgString, format) {
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImageElement(svgUrl);
    const dimensions = getSvgDimensions(svgString, image);
    return exportCanvas(drawImageToCanvas(image, format, dimensions), format);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function convertImageToFormat(image, format) {
  return exportCanvas(drawImageToCanvas(image, format), format);
}

async function exportCanvas(canvas, format) {
  if (format === "pdf") {
    return createPdfBlob(canvas, getExportQuality());
  }

  const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}`;
  return canvasToBlob(canvas, mimeType, getExportQuality());
}

function drawImageToCanvas(image, format, forcedDimensions = null) {
  const width = Math.max(
    1,
    Math.round(forcedDimensions?.width || image.naturalWidth || image.width || 1)
  );
  const height = Math.max(
    1,
    Math.round(forcedDimensions?.height || image.naturalHeight || image.height || 1)
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is unavailable");
  }

  if (needsOpaqueBackground(format)) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function getSvgDimensions(svgString, image) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgString, "image/svg+xml");
  const svg = documentNode.querySelector("svg");
  const fallbackWidth = image.naturalWidth || image.width || 512;
  const fallbackHeight = image.naturalHeight || image.height || 512;

  if (!svg) {
    return { width: fallbackWidth, height: fallbackHeight };
  }

  const widthAttr = parseSvgDimension(svg.getAttribute("width"));
  const heightAttr = parseSvgDimension(svg.getAttribute("height"));
  const viewBoxValues = String(svg.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (widthAttr && heightAttr) {
    return { width: widthAttr, height: heightAttr };
  }

  if (viewBoxValues.length === 4 && viewBoxValues[2] > 0 && viewBoxValues[3] > 0) {
    const viewBoxWidth = viewBoxValues[2];
    const viewBoxHeight = viewBoxValues[3];

    if (widthAttr) {
      return { width: widthAttr, height: Math.round(widthAttr * (viewBoxHeight / viewBoxWidth)) };
    }

    if (heightAttr) {
      return { width: Math.round(heightAttr * (viewBoxWidth / viewBoxHeight)), height: heightAttr };
    }

    return { width: viewBoxWidth, height: viewBoxHeight };
  }

  return { width: widthAttr || fallbackWidth, height: heightAttr || fallbackHeight };
}

function parseSvgDimension(value) {
  const parsed = Number.parseFloat(String(value || "").replace(/px$/i, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Could not create ${mimeType} file`));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });
}

async function createPdfBlob(canvas, quality) {
  const jpegBlob = await canvasToBlob(canvas, "image/jpeg", quality);
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const width = Math.max(1, Math.round(canvas.width));
  const height = Math.max(1, Math.round(canvas.height));

  const contentStream = encodePdfText(`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`);
  const header = concatUint8Arrays([
    encodePdfText("%PDF-1.4\n"),
    new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])
  ]);

  const objects = [
    encodePdfText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    encodePdfText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    encodePdfText(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>\nendobj\n`
    ),
    concatUint8Arrays([
      encodePdfText(
        `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
      ),
      jpegBytes,
      encodePdfText("\nendstream\nendobj\n")
    ]),
    concatUint8Arrays([
      encodePdfText(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n`),
      contentStream,
      encodePdfText("endstream\nendobj\n")
    ])
  ];

  let offset = header.length;
  const offsets = [0];
  objects.forEach((objectBytes) => {
    offsets.push(offset);
    offset += objectBytes.length;
  });

  const xrefOffset = offset;
  const xrefEntries = offsets
    .slice(1)
    .map((entry) => `${String(entry).padStart(10, "0")} 00000 n \n`)
    .join("");

  const xref = encodePdfText(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xrefEntries}`);
  const trailer = encodePdfText(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new Blob([header, ...objects, xref, trailer], { type: "application/pdf" });
}

function encodePdfText(text) {
  return PDF_TEXT_ENCODER.encode(text);
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    combined.set(chunk, offset);
    offset += chunk.length;
  });

  return combined;
}

async function loadImageForConversion(item) {
  const sourceUrl = getImageSourceUrl(item);
  if (!sourceUrl) {
    throw new Error("Image source unavailable");
  }

  if (sourceUrl.startsWith("data:") || sourceUrl.startsWith("blob:")) {
    return {
      image: await loadImageElement(sourceUrl),
      cleanup() {}
    };
  }

  const blob = await fetchMediaBlob(sourceUrl);
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImageElement(objectUrl);
    return {
      image,
      cleanup() {
        URL.revokeObjectURL(objectUrl);
      }
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function loadImageElement(sourceUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = sourceUrl;
  });
}

async function fetchMediaBlob(url) {
  const response = await fetch(url, url.startsWith("data:") ? {} : { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to fetch media (${response.status})`);
  }

  return response.blob();
}

function getImageSourceUrl(item) {
  if (typeof item?.content === "string" && item.content.startsWith("data:")) {
    return item.content;
  }

  if (typeof item?.url === "string" && item.url) {
    return item.url;
  }

  if (typeof item?.content === "string" && item.content) {
    return item.content;
  }

  return "";
}

function getVideoSources(item) {
  const sources = [];
  const seenUrls = new Set();
  const rawSources = Array.isArray(item.sources) && item.sources.length ? [...item.sources] : [];

  if (item.url) {
    rawSources.unshift({ url: item.url, format: item.format });
  }

  rawSources.forEach((source) => {
    if (!source?.url || seenUrls.has(source.url)) return;

    seenUrls.add(source.url);
    sources.push({
      url: source.url,
      format: String(source.format || getFileExtension(source.url, item.format || "mp4")).toLowerCase()
    });
  });

  return sources;
}

function resolveVideoSource(item, requestedFormat) {
  const sources = getVideoSources(item);
  if (!sources.length) return null;

  if (requestedFormat === "original") {
    return sources[0];
  }

  return sources.find((source) => source.format === requestedFormat) || null;
}

function getAvailableVideoFormats(item) {
  const formats = [...new Set(getVideoSources(item).map((source) => source.format.toUpperCase()))];
  return formats.join(", ");
}

function getFileExtension(value, fallback = "bin") {
  const match = String(value || "").match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase() : fallback;
}

function sanitizeFilename(filename) {
  return String(filename || `download-${Date.now()}`)
    .split(/[?#]/)[0]
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");
}

function ensureFilename(filename, extension) {
  const cleanFilename = sanitizeFilename(filename);
  if (/\.[^./]+$/.test(cleanFilename)) {
    return cleanFilename;
  }

  return `${cleanFilename}.${extension}`;
}

function replaceFileExtension(filename, extension) {
  const cleanFilename = sanitizeFilename(filename || `download-${Date.now()}`);
  const baseName = cleanFilename.replace(/\.[^./]+$/, "");
  return `${baseName}.${extension}`;
}

function startDownload(options) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(options, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (typeof downloadId !== "number") {
        reject(new Error("Download could not be started"));
        return;
      }

      resolve(downloadId);
    });
  });
}

async function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    await startDownload({ url: objectUrl, filename });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  }
}

/* -------------------- UTILITIES -------------------- */
async function copyToClipboard(item) {
  try {
    const text = isSvgItem(item) ? item.content : item.url || item.content || "";
    await navigator.clipboard.writeText(text);
    statusEl.textContent = "📋 Copied!";
  } catch (error) {
    console.error("Clipboard error:", error);
    statusEl.textContent = "❌ Failed to copy";
  }
}

downloadAllBtn.addEventListener("click", async () => {
  if (currentItems.length === 0) {
    statusEl.textContent = "⚠️ No items to download";
    return;
  }

  statusEl.textContent = `📦 Downloading ${currentItems.length} items...`;
  downloadAllBtn.disabled = true;

  let successCount = 0;
  for (const item of currentItems) {
    const didStartDownload = await downloadItem(item);
    if (didStartDownload) {
      successCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  statusEl.textContent = `✅ Downloaded ${successCount}/${currentItems.length} items`;
  downloadAllBtn.disabled = false;
});

function setLoading(isLoading, text) {
  statusEl.textContent = text;

  if (isLoading) {
    scanBtn.textContent = "⏳ Scanning...";
    statusEl.classList.add("loading");
  } else {
    scanBtn.textContent = "🔍 Scan Page";
    statusEl.classList.remove("loading");
  }

  scanBtn.disabled = isLoading;
  itemsContainer.classList.toggle(LOADING_CLASS, isLoading);
}

// Event listeners for filters
filterSvg?.addEventListener("change", refreshCurrentView);
filterImg?.addEventListener("change", refreshCurrentView);
filterMp4?.addEventListener("change", refreshCurrentView);
filterWebm?.addEventListener("change", refreshCurrentView);
filterOther?.addEventListener("change", refreshCurrentView);
