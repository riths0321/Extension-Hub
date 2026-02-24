/**
 * Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function localizeElement(id, messageKey) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = chrome.i18n.getMessage(messageKey);
    }
}

function initializeApp() {
    // Localize all UI elements
    localizeElement('dropText', 'dropZoneText');
    localizeElement('widthLabel', 'widthLabel');
    localizeElement('heightLabel', 'heightLabel');
    localizeElement('qualityLabel', 'qualityLabel');
    
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.textContent = chrome.i18n.getMessage('processButton');
    }

    const processor = new ImageProcessor();
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const controls = document.getElementById('controls');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const qualityInput = document.getElementById('qualityInput');
    const qualityValue = document.getElementById('qualityValue');
    const lockAspectRatio = document.getElementById('lockAspectRatio');
    const optsBtn = document.getElementById('optsBtn');
    const removeBtn = document.getElementById('removeBtn');

    let currentFile = null;
    let originalBitmap = null;
    let aspectRatio = 1;
    let isUpdating = false; // Prevent infinite loops

    // Load saved settings
    loadSettings();

    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    // Remove File
    removeBtn.addEventListener('click', () => {
        resetState();
    });

    // Aspect Ratio Lock Toggle
    lockAspectRatio.addEventListener('change', (e) => {
        if (e.target.checked && widthInput.value && heightInput.value) {
            // Recalculate aspect ratio from current values
            aspectRatio = widthInput.value / heightInput.value;
        }
    });

    // Dimensions Input with Aspect Ratio Lock
    widthInput.addEventListener('input', () => {
        if (isUpdating) return;
        
        if (lockAspectRatio.checked && aspectRatio && widthInput.value) {
            isUpdating = true;
            heightInput.value = Math.round(widthInput.value / aspectRatio);
            isUpdating = false;
        }
    });

    heightInput.addEventListener('input', () => {
        if (isUpdating) return;
        
        if (lockAspectRatio.checked && aspectRatio && heightInput.value) {
            isUpdating = true;
            widthInput.value = Math.round(heightInput.value * aspectRatio);
            isUpdating = false;
        }
    });

    // Quality Slider
    qualityInput.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
    });

    // Options
    optsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options/options.html'));
        }
    });

    // Process Button
    processBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        const width = parseInt(widthInput.value) || undefined;
        const height = parseInt(heightInput.value) || undefined;
        const quality = parseInt(qualityInput.value) / 100;
        const format = document.querySelector('input[name="format"]:checked').value;

        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';

        try {
            const blob = await processor.processImage(currentFile, {
                width,
                height,
                quality,
                format
            });

            downloadBlob(blob, format);
        } catch (err) {
            console.error(err);
            alert('Error processing image');
        } finally {
            processBtn.disabled = false;
            processBtn.textContent = chrome.i18n.getMessage('processButton');
        }
    });

    async function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        resetState(); // Clear previous
        currentFile = file;

        // Update UI
        dropZone.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        controls.classList.remove('disabled');
        processBtn.disabled = false;

        document.getElementById('fileName').textContent = Utils.truncateString(file.name);
        document.getElementById('fileSize').textContent = Utils.formatBytes(file.size);

        // Get Dimensions
        try {
            originalBitmap = await createImageBitmap(file);
            aspectRatio = originalBitmap.width / originalBitmap.height;

            widthInput.value = originalBitmap.width;
            heightInput.value = originalBitmap.height;
            
            // Clean up bitmap after getting dimensions
            originalBitmap.close();
            originalBitmap = null;
        } catch (e) {
            console.error('Could not read image dimensions', e);
        }
    }

    function resetState() {
        if (originalBitmap) {
            originalBitmap.close();
            originalBitmap = null;
        }
        currentFile = null;
        dropZone.classList.remove('hidden');
        fileInfo.classList.add('hidden');
        controls.classList.add('disabled');
        processBtn.disabled = true;
        fileInput.value = '';
        widthInput.value = '';
        heightInput.value = '';
        lockAspectRatio.checked = true;
        aspectRatio = 1;
    }

    function downloadBlob(blob, format) {
        if (!chrome.downloads) {
            alert('Error: Downloads permission missing. Please reload the extension in chrome://extensions.');
            return;
        }

        const url = URL.createObjectURL(blob);
        const originalName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.'));
        const ext = format === 'jpeg' ? 'jpg' : format;

        chrome.downloads.download({
            url: url,
            filename: `${originalName}_resized.${ext}`,
            saveAs: true
        }, () => {
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        });
    }

    function loadSettings() {
        chrome.storage.sync.get(['defaultFormat', 'defaultQuality'], (items) => {
            if (items.defaultFormat) {
                const radio = document.querySelector(`input[name="format"][value="${items.defaultFormat}"]`);
                if (radio) radio.checked = true;
            }
            if (items.defaultQuality) {
                qualityInput.value = items.defaultQuality;
                qualityValue.textContent = `${items.defaultQuality}%`;
            }
        });
    }
}