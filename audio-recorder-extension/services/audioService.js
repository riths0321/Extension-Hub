// audioService.js — WAV conversion
var AudioService = {
  async convertToWAV(webmBlob) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioContext.close();
    return this.audioBufferToWav(audioBuffer);
  },

  audioBufferToWav(buffer) {
    const numCh = buffer.numberOfChannels;
    const sr = buffer.sampleRate;
    let samples = buffer.getChannelData(0);
    if (numCh > 1) {
      const s2 = buffer.getChannelData(1);
      const merged = new Float32Array(samples.length * 2);
      for (let i = 0; i < samples.length; i++) {
        merged[i*2] = samples[i];
        merged[i*2+1] = s2[i];
      }
      samples = merged;
    }
    return this._encodeWAV(samples, sr, numCh);
  },

  _encodeWAV(samples, sr, numCh) {
    const bps = 2;
    const buf = new ArrayBuffer(44 + samples.length * bps);
    const v = new DataView(buf);
    const ws = (o, s) => { for (let i=0;i<s.length;i++) v.setUint8(o+i, s.charCodeAt(i)); };
    ws(0,'RIFF'); v.setUint32(4, 36 + samples.length*bps, true); ws(8,'WAVE');
    ws(12,'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, numCh, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr*numCh*bps, true); v.setUint16(32, numCh*bps, true);
    v.setUint16(34, 16, true); ws(36,'data'); v.setUint32(40, samples.length*bps, true);
    let offset = 44;
    for (let i=0; i<samples.length; i++, offset+=2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  }
};
