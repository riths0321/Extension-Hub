// Note: Download jspdf.umd.min.js and put it in a /lib folder
// Libraries
const { jsPDF } = window.jspdf || {};
const marked = window.marked || { parse: (t) => t }; // Fallback

const textInput = document.getElementById("textInput");
const fileNameInput = document.getElementById("fileName");
const charCount = document.getElementById("charCount");
const wordCount = document.getElementById("wordCount");
const pdfBtn = document.getElementById("pdfBtn");
const txtBtn = document.getElementById("txtBtn");
const renderContainer = document.getElementById("pdfRenderContainer");

// UI Updates
textInput.addEventListener("input", () => {
  const text = textInput.value;
  const len = text.length;

  // Update counters
  charCount.textContent = len;
  wordCount.textContent = `${text.trim() ? text.trim().split(/\s+/).length : 0} words`;

  // Toggle buttons
  const isEmpty = len === 0;
  pdfBtn.disabled = txtBtn.disabled = isEmpty;
});

// Pro PDF Generation (Markdown + Emojis + Formatting)
pdfBtn.addEventListener("click", async () => {
  const rawText = textInput.value.trim();
  const rawName = fileNameInput.value.trim() || "document";
  const fileName = rawName + ".pdf";

  if (!jsPDF || !window.html2canvas || !window.marked) {
    alert("Libraries loading... Try again in 2 seconds.");
    return;
  }

  // 1. Convert Markdown to HTML
  const rawHtml = marked.parse(rawText);

  // 1.5 Sanitize HTML (Deep CSP requirement)
  // Ensure no scripts or unsafe attributes are injected
  if (!window.DOMPurify) {
    alert("Security module not loaded. Please reload extension.");
    return;
  }

  const htmlContent = window.DOMPurify.sanitize(rawHtml);

  // 2. Render to Hidden Container (for visual fidelity)
  renderContainer.innerHTML = htmlContent;

  // 3. Status Update
  const originalBtnText = pdfBtn.textContent;
  pdfBtn.textContent = "Generating...";
  pdfBtn.disabled = true;

  try {
    // 4. Capture as Image (High Quality)
    const canvas = await html2canvas(renderContainer, {
      scale: 2, // Retina quality
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');

    // 5. Generate PDF
    // A4 Size: 210mm x 297mm
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    // Page Dimensions
    const pdfPageWidth = 210;
    const pdfPageHeight = 297;
    const topMargin = 15; // Gap at top of subsequent pages
    const contentHeightFirstPage = 297;
    const contentHeightSubsequent = 297 - topMargin; // 282mm of new content per page

    // Metrics
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let sourceY = 0; // The y-coordinate in source image we are currently at top of page

    // Page 1: Standard Full Bleed (Title Page usually)
    // Print the image starting at sourceY=0
    doc.addImage(imgData, 'PNG', 0, -sourceY, imgWidth, imgHeight);

    sourceY += contentHeightFirstPage; // Consumed 297mm
    heightLeft -= contentHeightFirstPage;

    // Subsequent Pages
    while (heightLeft > 0) {
      doc.addPage();

      // Calculate where to print the image so that 'sourceY' aligns with 'topMargin'
      // effectively pushing the content down by 'topMargin'
      let printY = topMargin - sourceY;

      doc.addImage(imgData, 'PNG', 0, printY, imgWidth, imgHeight);

      // Mask the top margin area with a white rectangle
      // This hides the repeated content from the previous page that slid down into the margin
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pdfPageWidth, topMargin, 'F');

      // Advance trackers
      sourceY += contentHeightSubsequent; // We consumed another 282mm of unique content
      heightLeft -= contentHeightSubsequent;
    }

    doc.save(fileName);

  } catch (error) {
    console.error("PDF Gen Error:", error);
    alert("Failed to generate PDF. Check console.");
  } finally {
    pdfBtn.textContent = originalBtnText;
    pdfBtn.disabled = false;
    // Clean up
    renderContainer.innerHTML = "";
  }
});

// Standard .txt Download
txtBtn.addEventListener("click", () => {
  const text = textInput.value;
  const rawName = fileNameInput.value.trim() || "notes";
  const fileName = rawName.endsWith('.txt') ? rawName : `${rawName}.txt`;

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
});