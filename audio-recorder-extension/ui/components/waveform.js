// waveform.js
var WaveformComponent = {
  async createFromBlob(canvas, blob) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var ab = await blob.arrayBuffer();
      var audioBuffer = await audioCtx.decodeAudioData(ab);
      audioCtx.close();
      this._draw(canvas, ctx, audioBuffer);
    } catch (_) {
      this.drawPlaceholder(canvas);
    }
  },

  _draw(canvas, ctx, audioBuffer) {
    var data = audioBuffer.getChannelData(0);
    var w = canvas.width;
    var h = canvas.height;
    var step = Math.ceil(data.length / w);
    var amp = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(37,99,235,0.08)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2563EB';

    for (var i = 0; i < w; i++) {
      var min = 1, max = -1;
      for (var j = 0; j < step; j++) {
        var val = data[i * step + j];
        if (val !== undefined) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
      var y1 = Math.round((1 + min) * amp);
      var y2 = Math.round((1 + max) * amp);
      ctx.fillRect(i, y1, 1, Math.max(1, y2 - y1));
    }
  },

  // Public — called from popup.js after recordingSaved when blob is not available
  drawPlaceholder(canvas) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(37,99,235,0.08)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2563EB';
    for (var i = 0; i < w; i += 3) {
      var barH = Math.random() * h * 0.7 + h * 0.1;
      ctx.fillRect(i, (h - barH) / 2, 2, barH);
    }
  }
};
