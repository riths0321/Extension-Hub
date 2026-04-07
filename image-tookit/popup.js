// ============================================================
// IMAGE PRO STUDIO — popup.js
// ============================================================

// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tabId}-section`).classList.add('active');
    });
});

// ============================================================
// CHIP TOGGLE HELPER
// ============================================================
function initChipGroup(groupId, onChange) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            onChange(chip.dataset.ratio || chip.dataset.format);
        });
    });
}

// Active value getters
function getActiveChip(groupId, attr) {
    const group = document.getElementById(groupId);
    if (!group) return null;
    const active = group.querySelector('.chip.active');
    return active ? active.dataset[attr] : null;
}

// ============================================================
// IMAGE CROPPER
// ============================================================
let cropper;
let isCropperProcessing = false;

const upload = document.getElementById('upload');
const image = document.getElementById('image');
const cropPlaceholder = document.getElementById('cropPlaceholder');
const downloadCropBtn = document.getElementById('download-crop');

// Init chip groups
initChipGroup('ratio-chips', (val) => {
    if (!cropper) return;
    let ratio = NaN;
    if (val === '1') ratio = 1;
    if (val === '16/9') ratio = 16 / 9;
    if (val === '4/3') ratio = 4 / 3;
    cropper.setAspectRatio(ratio);
});

initChipGroup('format-chips', () => { }); // just tracks active state

upload.addEventListener('change', () => {
    if (isCropperProcessing) return;
    const file = upload.files[0];
    if (!file) return;

    isCropperProcessing = true;
    const reader = new FileReader();

    reader.onload = () => {
        if (cropPlaceholder) cropPlaceholder.style.display = 'none';
        image.style.display = 'block';
        image.src = reader.result;

        image.onload = () => {
            if (cropper) cropper.destroy();

            // Apply current ratio chip
            const ratioVal = getActiveChip('ratio-chips', 'ratio');
            let initRatio = NaN;
            if (ratioVal === '1') initRatio = 1;
            if (ratioVal === '16/9') initRatio = 16 / 9;
            if (ratioVal === '4/3') initRatio = 4 / 3;

            cropper = new Cropper(image, {
                viewMode: 1,
                autoCrop: true,
                autoCropArea: 0.8,
                dragMode: 'crop',
                responsive: true,
                guides: true,
                center: true,
                background: true,
                aspectRatio: initRatio,
                ready: () => { isCropperProcessing = false; }
            });
        };
    };

    reader.readAsDataURL(file);
});

downloadCropBtn.addEventListener('click', () => {
    if (!cropper || isCropperProcessing) {
        alert('Please upload and crop an image first.');
        return;
    }

    const format = getActiveChip('format-chips', 'format') || 'png';
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const extension = format;

    const canvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        fillColor: format === 'png' ? 'transparent' : '#fff'
    });

    canvas.toBlob((blob) => {
        if (!blob) { alert('Error generating image.'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cropped-image.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, mimeType, 1.0);
});

// ============================================================
// IMAGE TO PDF
// ============================================================
const imageInput = document.getElementById('imageInput');
const convertBtn = document.getElementById('convertBtn');
const statusMsg = document.getElementById('statusMsg');
const fileCount = document.getElementById('fileCount');
const pdfPreviewGrid = document.getElementById('pdf-preview-grid');

imageInput.onclick = () => { imageInput.value = ''; };

imageInput.onchange = () => {
    const files = [...imageInput.files];
    const count = files.length;
    fileCount.textContent = count > 0 ? `${count} file${count > 1 ? 's' : ''} selected` : 'No files selected';
    statusMsg.textContent = '';

    pdfPreviewGrid.innerHTML = '';
    files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'thumb-container';
            div.setAttribute('data-index', idx + 1);
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = `Image ${idx + 1}`;
            div.appendChild(img);
            pdfPreviewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
};

convertBtn.onclick = async () => {
    if (!imageInput.files.length) {
        statusMsg.textContent = 'Please select images first.';
        statusMsg.className = 'status-msg error';
        return;
    }

    try {
        convertBtn.disabled = true;
        statusMsg.className = 'status-msg';
        const files = [...imageInput.files];
        const imageDataList = [];

        for (let i = 0; i < files.length; i++) {
            statusMsg.textContent = `Processing image ${i + 1} of ${files.length}…`;
            const imgData = await imageToJpegData(files[i]);
            imageDataList.push(imgData);
        }

        statusMsg.textContent = 'Generating PDF…';
        const pdfBlob = generatePDFWithoutLibrary(imageDataList);

        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = 'images-to-pdf.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        statusMsg.textContent = '✅ PDF Downloaded Successfully!';
        statusMsg.className = 'status-msg';
        imageInput.value = '';
        fileCount.textContent = 'No files selected';

    } catch (error) {
        console.error(error);
        statusMsg.textContent = '❌ Error: ' + error.message;
        statusMsg.className = 'status-msg error';
    } finally {
        convertBtn.disabled = false;
    }
};

function imageToJpegData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
                const cleanData = dataUrl.split(',')[1];
                resolve({ width: img.width, height: img.height, data: cleanData });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// PDF Generation (pure JS, no library)
function generatePDFWithoutLibrary(images) {
    const header = '%PDF-1.4\n';
    let buffer = [header];
    let currentOffset = header.length;
    let bodyBuffer = [];
    let kidsRefs = [];
    let nextId = 3;

    images.forEach(img => {
        const imgId = nextId++;
        const imgStream = atob(img.data);
        const imgContent = `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgStream.length} >>\nstream\n${imgStream}\nendstream`;

        const contentId = nextId++;
        const pW = 595.28, pH = 841.89, m = 20;
        const maxW = pW - 2 * m, maxH = pH - 2 * m;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const dW = (img.width * scale).toFixed(2);
        const dH = (img.height * scale).toFixed(2);
        const dx = ((pW - dW) / 2).toFixed(2);
        const dy = ((pH - dH) / 2).toFixed(2);

        const streamData = `q ${dW} 0 0 ${dH} ${dx} ${dy} cm /I1 Do Q`;
        const pageContent = `<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream`;

        const pageId = nextId++;
        const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pW} ${pH}] /Contents ${contentId} 0 R /Resources << /XObject << /I1 ${imgId} 0 R >> >> >>`;

        kidsRefs.push(`${pageId} 0 R`);
        bodyBuffer.push({ id: imgId, content: imgContent });
        bodyBuffer.push({ id: contentId, content: pageContent });
        bodyBuffer.push({ id: pageId, content: pageObj });
    });

    const catalogContent = `<< /Type /Catalog /Pages 2 0 R >>`;
    const pagesContent = `<< /Type /Pages /Kids [${kidsRefs.join(' ')}] /Count ${kidsRefs.length} >>`;

    const allObjects = [
        { id: 1, content: catalogContent },
        { id: 2, content: pagesContent },
        ...bodyBuffer
    ];

    let xrefTable = [`0000000000 65535 f \n`];
    allObjects.forEach(obj => {
        const offsetStr = String(currentOffset).padStart(10, '0');
        xrefTable.push(`${offsetStr} 00000 n \n`);
        const objStr = `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
        buffer.push(objStr);
        currentOffset += objStr.length;
    });

    const xrefOffset = currentOffset;
    buffer.push(`xref\n0 ${allObjects.length + 1}\n`);
    buffer.push(xrefTable.join(''));
    buffer.push(`trailer\n<< /Size ${allObjects.length + 1} /Root 1 0 R >>\n`);
    buffer.push(`startxref\n${xrefOffset}\n%%EOF`);

    const rawData = buffer.join('');
    const bytes = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        bytes[i] = rawData.charCodeAt(i) & 0xff;
    }

    return new Blob([bytes], { type: 'application/pdf' });
}