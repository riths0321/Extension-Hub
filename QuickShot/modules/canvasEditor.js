import { showToast } from "./toast.js";

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function makeCanvas(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

function fitWithin({ width, height }, maxDim) {
  if (width <= maxDim && height <= maxDim) return { width, height, scale: 1 };
  const scale = Math.min(maxDim / width, maxDim / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale
  };
}

export class QuickShotCanvasEditor {
  constructor(displayCanvas, { maxDim = 1600 } = {}) {
    this.displayCanvas = displayCanvas;
    this.displayCtx = displayCanvas.getContext("2d", { alpha: false, desynchronized: true });

    this.maxDim = maxDim;

    this.backCanvas = makeCanvas(1, 1);
    this.backCtx = this.backCanvas.getContext("2d", { alpha: false, willReadFrequently: true });

    this.overlayCanvas = makeCanvas(1, 1);
    this.overlayCtx = this.overlayCanvas.getContext("2d");

    this.tool = "pen";
    this.color = "#2563EB";
    this.brushSize = 4;
    this.opacity = 1;

    this.isPointerDown = false;
    this.start = { x: 0, y: 0 };
    this.last = { x: 0, y: 0 };
    this.textInsertAt = null;

    this.undoStack = [];
    this.redoStack = [];
    this.maxUndo = 12;

    this.baseImageDataUrl = null;
    this.baseDraft = null;

    this._dirty = true;
    this._raf = 0;
  }

  attachPointerHandlers({ onTextRequested } = {}) {
    const onDown = (ev) => {
      if (ev.button !== 0) return;
      const p = this._toBackCoords(ev);
      this.isPointerDown = true;
      this.start = p;
      this.last = p;
      this._clearOverlay();

      if (this.tool === "text") {
        this.isPointerDown = false;
        this.textInsertAt = p;
        onTextRequested?.(p);
        return;
      }

      if (this.tool === "pen") {
        this._beginStroke(p);
      } else if (this.tool === "crop" || this._isShapeTool()) {
        this._beginOverlay();
      }
    };

    const onMove = (ev) => {
      const p = this._toBackCoords(ev);
      if (!p) return;

      if (!this.isPointerDown) return;

      if (this.tool === "pen") {
        this._strokeTo(p);
      } else if (this.tool === "crop" || this._isShapeTool()) {
        this._drawOverlayPreview(p);
      }
    };

    const onUp = (ev) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      const p = this._toBackCoords(ev);

      if (this.tool === "pen") {
        this._endStroke();
        return;
      }

      if (this.tool === "crop") {
        this._commitCrop(p);
        return;
      }

      if (this._isShapeTool()) {
        this._commitShape(p);
        return;
      }
    };

    const onLeave = () => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      if (this.tool === "pen") this._endStroke();
      this._clearOverlay();
    };

    this.displayCanvas.addEventListener("mousedown", onDown);
    this.displayCanvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    this.displayCanvas.addEventListener("mouseleave", onLeave);
  }

  setTool(tool) {
    this.tool = tool;
    if (tool !== "crop") this._clearOverlay();
  }

  setColor(color) {
    this.color = color;
  }

  setBrushSize(px) {
    this.brushSize = clamp(Number(px) || 1, 1, 72);
  }

  setOpacity(alpha) {
    this.opacity = clamp(Number(alpha) || 1, 0.05, 1);
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return;
    const current = this._snapshotState();
    this.redoStack.push(current);
    const prev = this.undoStack.pop();
    this._restoreState(prev);
    this._markDirty();
  }

  redo() {
    if (!this.canRedo()) return;
    const current = this._snapshotState();
    this.undoStack.push(current);
    const next = this.redoStack.pop();
    this._restoreState(next);
    this._markDirty();
  }

  saveState() {
    try {
      const snap = this._snapshotState();
      this.undoStack.push(snap);
      if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
      this.redoStack = [];
    } catch {
      // Large canvases can throw in constrained environments; keep UX smooth.
      this.undoStack = [];
      this.redoStack = [];
      showToast("Undo disabled for this image size");
    }
  }

  async loadFromDataUrl(dataUrl, cropRect = null) {
    this.baseDraft = { mode: "single", dataUrl, cropRect: cropRect || null };
    this.baseImageDataUrl = dataUrl || null;
    const img = await this._loadImage(dataUrl);

    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;

    if (cropRect) {
      const dpr = cropRect.devicePixelRatio || 1;
      sx = Math.round((cropRect.x || 0) * dpr);
      sy = Math.round((cropRect.y || 0) * dpr);
      sw = Math.round((cropRect.width || img.width) * dpr);
      sh = Math.round((cropRect.height || img.height) * dpr);
      sx = clamp(sx, 0, img.width - 1);
      sy = clamp(sy, 0, img.height - 1);
      sw = clamp(sw, 1, img.width - sx);
      sh = clamp(sh, 1, img.height - sy);
    }

    const fitted = fitWithin({ width: sw, height: sh }, this.maxDim);
    this._resizeBack(fitted.width, fitted.height);

    this.backCtx.fillStyle = "#ffffff";
    this.backCtx.fillRect(0, 0, this.backCanvas.width, this.backCanvas.height);
    this.backCtx.drawImage(img, sx, sy, sw, sh, 0, 0, this.backCanvas.width, this.backCanvas.height);

    this._resizeDisplayToFit();
    this.undoStack = [];
    this.redoStack = [];
    this.saveState();
    this._markDirty();
  }

  resetToBase() {
    if (!this.baseDraft) return;
    if (this.baseDraft.mode === "full") {
      return this.loadFromSegments(this.baseDraft.captures, this.baseDraft.dims);
    }
    if (!this.baseDraft.dataUrl) return;
    return this.loadFromDataUrl(this.baseDraft.dataUrl, this.baseDraft.cropRect || null);
  }

  clearCanvas() {
    this.saveState();
    this.backCtx.fillStyle = "#ffffff";
    this.backCtx.fillRect(0, 0, this.backCanvas.width, this.backCanvas.height);
    this._clearOverlay();
    this._markDirty();
  }

  async exportBlob({ format = "png", jpgQuality = 0.92 } = {}) {
    const type = String(format).toLowerCase() === "jpg" ? "image/jpeg" : "image/png";
    const q = clamp(jpgQuality, 0.5, 0.98);
    return await new Promise((resolve) => {
      this.backCanvas.toBlob((blob) => resolve(blob), type, type === "image/jpeg" ? q : undefined);
    });
  }

  async loadFromSegments(captures, dims) {
    if (!Array.isArray(captures) || !captures.length || !dims?.viewportWidth || !dims?.viewportHeight) {
      throw new Error("Invalid full-page capture");
    }

    this.baseDraft = { mode: "full", captures, dims };
    this.baseImageDataUrl = null;

    const dpr = Number(dims.devicePixelRatio || 1);
    const totalW = Math.max(1, Math.round(dims.viewportWidth * dpr));
    const totalH = Math.max(1, Math.round(dims.height * dpr));

    const fitted = fitWithin({ width: totalW, height: totalH }, this.maxDim);
    const scale = fitted.scale;
    const outW = fitted.width;
    const outH = fitted.height;

    this._resizeBack(outW, outH);
    this.backCtx.fillStyle = "#ffffff";
    this.backCtx.fillRect(0, 0, outW, outH);

    // Draw each viewport capture into scaled output canvas.
    for (const cap of captures) {
      const img = await this._loadImage(cap.dataUrl);
      const yPx = Math.max(0, Math.round((cap.y || 0) * dpr));
      const dy = Math.round(yPx * scale);
      const dh = Math.round(img.height * scale);
      const dw = Math.round(img.width * scale);
      this.backCtx.drawImage(img, 0, 0, img.width, img.height, 0, dy, dw, dh);
    }

    this.undoStack = [];
    this.redoStack = [];
    this.saveState();
    this._markDirty();
  }

  // ---- internal drawing ----

  _isShapeTool() {
    return this.tool === "arrow" || this.tool === "rect" || this.tool === "circle";
  }

  _beginStroke(p) {
    this.saveState();
    this.backCtx.globalAlpha = this.opacity;
    this.backCtx.lineCap = "round";
    this.backCtx.lineJoin = "round";
    this.backCtx.lineWidth = this.brushSize;
    this.backCtx.strokeStyle = this.color;
    this.backCtx.beginPath();
    this.backCtx.moveTo(p.x, p.y);
  }

  _strokeTo(p) {
    this.backCtx.save();
    this.backCtx.globalAlpha = this.opacity;
    this.backCtx.lineCap = "round";
    this.backCtx.lineJoin = "round";
    this.backCtx.lineWidth = this.brushSize;
    this.backCtx.strokeStyle = this.color;
    this.backCtx.lineTo(p.x, p.y);
    this.backCtx.stroke();
    this.backCtx.restore();
    this.last = p;
    this._markDirty();
  }

  _endStroke() {
    this.backCtx.closePath?.();
    this._markDirty();
  }

  _beginOverlay() {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this._markDirty();
  }

  _drawOverlayPreview(p) {
    const x1 = this.start.x;
    const y1 = this.start.y;
    const x2 = p.x;
    const y2 = p.y;

    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.overlayCtx.save();
    this.overlayCtx.globalAlpha = this.opacity;
    this.overlayCtx.lineWidth = Math.max(1, this.brushSize);
    this.overlayCtx.strokeStyle = this.color;
    this.overlayCtx.fillStyle = this.color;
    this.overlayCtx.lineCap = "round";
    this.overlayCtx.lineJoin = "round";

    if (this.tool === "rect" || this.tool === "crop") {
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      this.overlayCtx.setLineDash(this.tool === "crop" ? [6, 4] : []);
      this.overlayCtx.strokeRect(left, top, w, h);
      if (this.tool === "crop") {
        this.overlayCtx.globalAlpha = 0.15;
        this.overlayCtx.fillRect(left, top, w, h);
      }
    } else if (this.tool === "circle") {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      this.overlayCtx.beginPath();
      this.overlayCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      this.overlayCtx.stroke();
    } else if (this.tool === "arrow") {
      this._drawArrow(this.overlayCtx, x1, y1, x2, y2);
    }

    this.overlayCtx.restore();
    this._markDirty();
  }

  _commitShape(p) {
    const dx = Math.abs(p.x - this.start.x);
    const dy = Math.abs(p.y - this.start.y);
    if (dx < 2 && dy < 2) {
      this._clearOverlay();
      return;
    }
    this.saveState();
    this.backCtx.drawImage(this.overlayCanvas, 0, 0);
    this._clearOverlay();
    this._markDirty();
  }

  _commitCrop(p) {
    const left = Math.round(Math.min(this.start.x, p.x));
    const top = Math.round(Math.min(this.start.y, p.y));
    const w = Math.round(Math.abs(p.x - this.start.x));
    const h = Math.round(Math.abs(p.y - this.start.y));

    this._clearOverlay();

    if (w < 12 || h < 12) {
      showToast("Crop area too small");
      return;
    }

    this.saveState();

    const next = makeCanvas(w, h);
    const nctx = next.getContext("2d", { alpha: false, willReadFrequently: true });
    nctx.fillStyle = "#ffffff";
    nctx.fillRect(0, 0, w, h);
    nctx.drawImage(this.backCanvas, left, top, w, h, 0, 0, w, h);

    this.backCanvas = next;
    this.backCtx = nctx;
    this.overlayCanvas = makeCanvas(w, h);
    this.overlayCtx = this.overlayCanvas.getContext("2d");

    this._resizeDisplayToFit();
    this._markDirty();
  }

  async addText({ text, size = 22, font = "Manrope" } = {}) {
    if (!text || !this.textInsertAt) return;
    this.saveState();
    this.backCtx.save();
    this.backCtx.globalAlpha = this.opacity;
    this.backCtx.fillStyle = this.color;
    this.backCtx.textBaseline = "top";
    this.backCtx.font = `${Math.round(clamp(size, 10, 72))}px ${font}, sans-serif`;
    this.backCtx.fillText(text, this.textInsertAt.x, this.textInsertAt.y);
    this.backCtx.restore();
    this.textInsertAt = null;
    this._markDirty();
  }

  _drawArrow(ctx, x1, y1, x2, y2) {
    const head = Math.max(10, this.brushSize * 2.2);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  }

  _clearOverlay() {
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this._markDirty();
  }

  _resizeBack(w, h) {
    this.backCanvas.width = w;
    this.backCanvas.height = h;
    this.overlayCanvas.width = w;
    this.overlayCanvas.height = h;
  }

  _snapshotState() {
    return {
      w: this.backCanvas.width,
      h: this.backCanvas.height,
      data: this.backCtx.getImageData(0, 0, this.backCanvas.width, this.backCanvas.height)
    };
  }

  _restoreState(state) {
    if (!state?.data) return;
    if (this.backCanvas.width !== state.w || this.backCanvas.height !== state.h) {
      this.backCanvas = makeCanvas(state.w, state.h);
      this.backCtx = this.backCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
      this.overlayCanvas = makeCanvas(state.w, state.h);
      this.overlayCtx = this.overlayCanvas.getContext("2d");
    }
    this.backCtx.putImageData(state.data, 0, 0);
    this._clearOverlay();
  }

  _resizeDisplayToFit() {
    // Kept for popup fixed sizing; also correct after any DOM change.
    const wrap = this.displayCanvas.parentElement;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(wrapRect.width * dpr));
    const h = Math.max(1, Math.round(wrapRect.height * dpr));
    if (this.displayCanvas.width !== w) this.displayCanvas.width = w;
    if (this.displayCanvas.height !== h) this.displayCanvas.height = h;
    this._markDirty();
  }

  _markDirty() {
    this._dirty = true;
    if (this._raf) return;
    this._raf = window.requestAnimationFrame(() => {
      this._raf = 0;
      if (!this._dirty) return;
      this._dirty = false;
      this._render();
    });
  }

  _render() {
    this._resizeDisplayToFit();
    const ctx = this.displayCtx;
    const dw = this.displayCanvas.width;
    const dh = this.displayCanvas.height;
    ctx.clearRect(0, 0, dw, dh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.backCanvas, 0, 0, dw, dh);
    ctx.drawImage(this.overlayCanvas, 0, 0, dw, dh);
  }

  _toBackCoords(ev) {
    const rect = this.displayCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    return {
      x: clamp(Math.round(x * this.backCanvas.width), 0, this.backCanvas.width),
      y: clamp(Math.round(y * this.backCanvas.height), 0, this.backCanvas.height)
    };
  }

  _loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  }
}
