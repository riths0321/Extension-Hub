/* content.js - Enhanced Media Extractor */

(() => {
if (window.__MEDIA_FINDER_CONTENT_SCRIPT_READY__) {
  return;
}

window.__MEDIA_FINDER_CONTENT_SCRIPT_READY__ = true;

function extractAllMedia() {
  const icons = [];
  const videos = [];
  const seenIcons = new Set();
  const seenVideos = new Set();
  let iconIndex = 0;
  let videoIndex = 0;

  function traverse(node) {
    if (!node) return;

    if (node.nodeType === Node.ELEMENT_NODE) {
      processElement(node);
    }

    if (node.children) {
      Array.from(node.children).forEach((child) => traverse(child));
    }

    if (node.shadowRoot) {
      Array.from(node.shadowRoot.children).forEach((child) => traverse(child));
    }
  }

  function processElement(el) {
    const tagName = el.tagName.toLowerCase();

    if (tagName === "svg") {
      processSVG(el);
    } else if (tagName === "img") {
      processImg(el);
    } else if (tagName === "input" && String(el.type || "").toLowerCase() === "image") {
      processImageLikeElement(el);
    } else if (tagName === "video") {
      processVideo(el);
    }

    processStyles(el);
    processStyles(el, "::before");
    processStyles(el, "::after");
  }

  function processVideo(video) {
    try {
      const sources = collectVideoSources(video);
      if (!sources.length) return;

      const primarySource = sources[0];
      const key = sources.map((source) => source.url).sort().join("|");
      if (seenVideos.has(key)) return;
      seenVideos.add(key);

      const itemNumber = videoIndex + 1;
      videos.push({
        id: videoIndex++,
        type: "video",
        url: primarySource.url,
        poster: normalizeUrl(video.poster),
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        format: primarySource.format,
        sources,
        availableFormats: [...new Set(sources.map((source) => source.format))],
        name: `video-${itemNumber}.${primarySource.format}`
      });

      if (video.poster) {
        const posterUrl = normalizeUrl(video.poster);
        if (posterUrl && !seenIcons.has(posterUrl)) {
          const itemNumber = iconIndex + 1;
          seenIcons.add(posterUrl);
          icons.push({
            id: iconIndex++,
            type: "image",
            content: posterUrl,
            url: posterUrl,
            ext: getExt(posterUrl),
            name: `poster-${itemNumber}.${getExt(posterUrl)}`
          });
        }
      }
    } catch (error) {
      console.warn("Video processing error:", error);
    }
  }

  function collectVideoSources(video) {
    const sources = [];
    const seenSourceUrls = new Set();

    const addSource = (url, mimeType = "") => {
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl || seenSourceUrls.has(normalizedUrl)) return;

      seenSourceUrls.add(normalizedUrl);
      sources.push({
        url: normalizedUrl,
        format: getVideoFormat(normalizedUrl, mimeType)
      });
    };

    addSource(video.currentSrc || video.src, video.currentType || video.type || "");

    Array.from(video.querySelectorAll("source")).forEach((source) => {
      addSource(source.currentSrc || source.src || source.getAttribute("src"), source.type || "");
    });

    return sources;
  }

  function getVideoFormat(url, mimeType = "") {
    const mime = String(mimeType || "").split(";")[0].trim().toLowerCase();
    const mimeMap = {
      "application/vnd.apple.mpegurl": "m3u8",
      "application/x-mpegurl": "m3u8",
      "video/mp4": "mp4",
      "video/ogg": "ogg",
      "video/quicktime": "mov",
      "video/webm": "webm",
      "video/x-matroska": "mkv",
      "video/x-msvideo": "avi"
    };

    if (mimeMap[mime]) {
      return mimeMap[mime];
    }

    const validFormats = ["mp4", "webm", "mov", "avi", "mkv", "m3u8", "ogg"];
    const ext = getExt(url);
    return validFormats.includes(ext) ? ext : "mp4";
  }

  function processSVG(svg) {
    try {
      const useElement = svg.querySelector("use");
      if (useElement) {
        resolveSvgSprite(svg, useElement);
      }

      if (!svg.getAttribute("xmlns")) {
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      const content = svg.outerHTML;
      const key = content.substring(0, 200);

      if (!seenIcons.has(key)) {
        const itemNumber = iconIndex + 1;
        seenIcons.add(key);
        icons.push({
          id: iconIndex++,
          type: "svg",
          content,
          ext: "svg",
          name: `icon-${itemNumber}.svg`
        });
      }
    } catch (error) {
      console.warn("SVG processing error:", error);
    }
  }

  function processImg(img) {
    const base64 = getBase64Image(img);
    addImageAsset(img.currentSrc || img.src, {
      content: base64,
      namePrefix: "image"
    });
  }

  function processImageLikeElement(el) {
    addImageAsset(el.currentSrc || el.src || el.getAttribute("src"), {
      namePrefix: "image"
    });
  }

  function processStyles(el, pseudo = null) {
    const style = window.getComputedStyle(el, pseudo);
    handleUrlProperty(style.backgroundImage);
    handleUrlProperty(style.webkitMaskImage || style.maskImage);
  }

  function handleUrlProperty(propValue) {
    if (!propValue || propValue === "none" || propValue.includes("gradient")) return;

    const urlMatches = propValue.matchAll(/url\((["']?)(.*?)\1\)/g);
    for (const match of urlMatches) {
      addImageAsset(match[2], { namePrefix: "icon" });
    }
  }

  function findVideoLinks() {
    const selector = [
      'a[href*=".mp4"]',
      'a[href*=".webm"]',
      'a[href*=".mov"]',
      'a[href*=".avi"]',
      'a[href*=".mkv"]',
      'a[href*=".m3u8"]',
      'a[href*=".ogg"]'
    ].join(", ");

    document.querySelectorAll(selector).forEach((link) => {
      const url = normalizeUrl(link.href);
      if (!url || seenVideos.has(url)) return;

      const format = getVideoFormat(url, link.type || "");
      const itemNumber = videoIndex + 1;
      seenVideos.add(url);
      videos.push({
        id: videoIndex++,
        type: "video",
        url,
        format,
        sources: [{ url, format }],
        availableFormats: [format],
        name: `video-${itemNumber}.${format}`
      });
    });
  }

  function findLinkedImages() {
    const iconLinkSelector = [
      'link[rel~="icon"][href]',
      'link[rel="shortcut icon"][href]',
      'link[rel="apple-touch-icon"][href]',
      'link[rel="apple-touch-icon-precomposed"][href]',
      'link[rel="mask-icon"][href]'
    ].join(", ");

    document.querySelectorAll(iconLinkSelector).forEach((link) => {
      addImageAsset(link.href || link.getAttribute("href"), { namePrefix: "site-icon" });
    });

    const metaImageSelector = [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[itemprop="image"]'
    ].join(", ");

    document.querySelectorAll(metaImageSelector).forEach((meta) => {
      addImageAsset(meta.content || meta.getAttribute("content"), { namePrefix: "meta-image" });
    });

    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.href || link.getAttribute("href");
      if (!looksLikeDirectImageUrl(href)) return;

      addImageAsset(href, { namePrefix: "linked-image" });
    });
  }

  function resolveSvgSprite(svg, use) {
    try {
      const href = use.getAttribute("href") || use.getAttribute("xlink:href");
      if (!href || !href.startsWith("#")) return;

      const id = href.substring(1);
      const sourceSymbol = document.getElementById(id);
      if (!sourceSymbol) return;

      const group = document.createElement("g");
      Array.from(sourceSymbol.childNodes).forEach((child) => {
        group.appendChild(child.cloneNode(true));
      });
      if (sourceSymbol.getAttribute("viewBox")) {
        svg.setAttribute("viewBox", sourceSymbol.getAttribute("viewBox"));
      }

      use.replaceWith(group);
    } catch (error) {
      console.warn("SVG sprite resolution error:", error);
    }
  }

  function getBase64Image(img) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL(getMimeTypeFromExt(getExt(img.currentSrc || img.src)));
    } catch {
      return null;
    }
  }

  function addImageAsset(url, options = {}) {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl || seenIcons.has(normalizedUrl)) return;

    const itemNumber = iconIndex + 1;
    const ext = getExt(normalizedUrl);

    seenIcons.add(normalizedUrl);
    icons.push({
      id: iconIndex++,
      type: "image",
      content: options.content || normalizedUrl,
      url: normalizedUrl,
      ext,
      name: `${options.namePrefix || "image"}-${itemNumber}.${ext}`
    });
  }

  function looksLikeDirectImageUrl(url) {
    if (!url) return false;
    if (String(url).startsWith("data:image/")) return true;
    return /\.(svg|png|webp|ico|gif|jpg|jpeg|avif|apng|bmp|tif|tiff)(\?.*)?$/i.test(url);
  }

  function getExt(url) {
    try {
      if (typeof url === "string" && url.startsWith("data:image/")) {
        const match = url.match(/^data:image\/([a-z0-9.+-]+)/i);
        const format = match ? match[1].toLowerCase() : "png";
        if (format === "svg+xml") return "svg";
        if (format === "jpeg") return "jpg";
        return format;
      }

      const normalized = normalizeUrl(url);
      const match = normalized.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
      return match ? match[1].toLowerCase() : "png";
    } catch {
      return "png";
    }
  }

  function getMimeTypeFromExt(ext) {
    const normalizedExt = String(ext || "").toLowerCase();
    if (normalizedExt === "jpg" || normalizedExt === "jpeg") return "image/jpeg";
    if (normalizedExt === "svg") return "image/svg+xml";
    return `image/${normalizedExt || "png"}`;
  }

  function normalizeUrl(url) {
    if (!url) return "";

    try {
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        return url;
      }
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }

  traverse(document.documentElement || document.body);
  findLinkedImages();
  findVideoLinks();

  return { icons, videos };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SCAN_MEDIA") {
    sendResponse(extractAllMedia());
  }

  return true;
});
})();
