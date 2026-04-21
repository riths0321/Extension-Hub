// waveform.js
var WaveformComponent = {
  async createFromBlob(canvas, blob) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ab = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(ab);
      audioCtx.close();
      this._draw(canvas, ctx, audioBuffer);
    } catch (e) {
      // fallback: show placeholder bars
      this._drawPlaceholder(canvas, ctx);
    }
  },

  _draw(canvas, ctx, audioBuffer) {
    const data = audioBuffer.getChannelData(0);
    const w = canvas.width;
    const h = canvas.height;
    const step = Math.ceil(data.length / w);
    const amp = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Light background
    ctx.fillStyle = 'rgba(37,99,235,0.08)';
    ctx.fillRect(0, 0, w, h);

    // Waveform
    ctx.fillStyle = '#2563EB';

    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const val = data[i * step + j];
        if (val !== undefined) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
      const y1 = Math.round((1 + min) * amp);
      const y2 = Math.round((1 + max) * amp);
      ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }
  },

  _drawPlaceholder(canvas, ctx) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(37,99,235,0.08)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2563EB';
    for (let i = 0; i < w; i += 3) {
      const barH = Math.random() * h * 0.7 + h * 0.1;
      ctx.fillRect(i, (h - barH) / 2, 2, barH);
    }
  }
};
