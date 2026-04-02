/**
 * qr.js — QR code scanner for otpauth:// URIs
 * Uses the jsQR library (loaded via popup.html script tag from local copy).
 * Falls back to image file input when camera is unavailable.
 */

const QRScanner = (() => {
  let videoStream = null;
  let scanInterval = null;

  /**
   * Scan a QR code from an uploaded image file.
   * Returns the decoded string or null.
   */
  async function scanFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        if (typeof jsQR === 'undefined') {
          reject(new Error('jsQR library not loaded'));
          return;
        }
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(result ? result.data : null);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  }

  /**
   * Start camera scanning, call onResult(decodedString) when found.
   * Call stopCamera() to clean up.
   */
  async function startCamera(videoEl, onResult, onError) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 300, height: 300 }
      });
      videoEl.srcObject = videoStream;
      await videoEl.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      scanInterval = setInterval(() => {
        if (videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) return;
        canvas.width  = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR === 'undefined') return;
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (result && result.data) {
          stopCamera();
          onResult(result.data);
        }
      }, 200);
    } catch (err) {
      onError(err);
    }
  }

  function stopCamera() {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    if (videoStream)  { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
  }

  return { scanFromFile, startCamera, stopCamera };
})();

if (typeof module !== 'undefined') module.exports = QRScanner;
