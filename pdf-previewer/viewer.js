const fullPdfViewer = document.getElementById("fullPdfViewer");

chrome.storage.local.get("fullPDF", (data) => {
  if (!data.fullPDF) return;

  // Convert base64 to Blob
  const base64 = data.fullPDF.split(",")[1];
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });

  const blobURL = URL.createObjectURL(blob);
  fullPdfViewer.src = blobURL;
});