// analyticsService.js
var AnalyticsService = {
  analyzeRecording(blob, duration) {
    return new Promise(resolve => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      blob.arrayBuffer().then(ab => {
        ctx.decodeAudioData(ab).then(audioBuffer => {
          const data = audioBuffer.getChannelData(0);
          let peak = 0, rmsSum = 0;
          for (let i = 0; i < data.length; i++) {
            const s = Math.abs(data[i]);
            if (s > peak) peak = s;
            rmsSum += s * s;
          }
          const rms = Math.sqrt(rmsSum / data.length);
          ctx.close();
          resolve({
            duration,
            peak,
            peakDB: peak > 0 ? Math.round(20 * Math.log10(peak)) : -60,
            rms,
            rmsDB: rms > 0 ? Math.round(20 * Math.log10(rms)) : -60,
            sampleRate: audioBuffer.sampleRate,
            channels: audioBuffer.numberOfChannels
          });
        }).catch(() => { ctx.close(); resolve({ duration, peak: 0, peakDB: -60 }); });
      }).catch(() => resolve({ duration, peak: 0, peakDB: -60 }));
    });
  }
};
