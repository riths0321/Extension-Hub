const fileInput = document.getElementById("fileInput");
const pdfViewer = document.getElementById("pdfViewer");
const selectFileBtn = document.getElementById("selectFileBtn");
const openFullBtn = document.getElementById("openFullBtn");

selectFileBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file || file.type !== "application/pdf") return;

  const fileURL = URL.createObjectURL(file);
  pdfViewer.src = fileURL;

  openFullBtn.disabled = false;

  // Convert to base64 and store safely
  const reader = new FileReader();
  reader.onload = function () {
    chrome.storage.local.set({ fullPDF: reader.result });
  };
  reader.readAsDataURL(file);
});

openFullBtn.addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("viewer.html")
  });
});