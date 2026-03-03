const allFieldIds = [
  "jobDescriptionUpload",
  "name",
  "phone",
  "email",
  "company",
  "address",
  "manager",
  "job",
  "subject",
  "experience",
  "skills",
  "jobDescriptionManual"
];

const fields = Object.fromEntries(allFieldIds.map((id) => [id, document.getElementById(id)]));

const modeUploadBtn = document.getElementById("modeUpload");
const modeManualBtn = document.getElementById("modeManual");
const uploadModeSection = document.getElementById("uploadModeSection");
const manualModeSection = document.getElementById("manualModeSection");

const resumeFileInput = document.getElementById("resumeFile");
const resumeMetaEl = document.getElementById("resumeMeta");

const analyzeBtn = document.getElementById("analyze");
const generateBtn = document.getElementById("generate");
const copyBtn = document.getElementById("copy");
const downloadBtn = document.getElementById("download");
const resetBtn = document.getElementById("reset");

const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const charCountEl = document.getElementById("charCount");

const skillBank = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "SQL", "HTML", "CSS",
  "Angular", "Vue", "Next.js", "AWS", "Docker", "Kubernetes", "Git", "REST", "GraphQL",
  "Testing", "Jest", "Cypress", "Figma", "UI/UX", "Agile", "Scrum", "Communication", "Leadership"
];

let currentMode = "upload";
let uploadedResumeText = "";

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function updateOutputState(letterText) {
  const hasLetter = Boolean(letterText && letterText.trim());
  output.textContent = hasLetter ? letterText : "No letter generated yet.";
  copyBtn.disabled = !hasLetter;
  downloadBtn.disabled = !hasLetter;
  charCountEl.textContent = `${hasLetter ? letterText.length : 0} chars`;
}

function setMode(mode) {
  currentMode = mode;
  const isUpload = mode === "upload";

  uploadModeSection.classList.toggle("hidden", !isUpload);
  manualModeSection.classList.toggle("hidden", isUpload);

  modeUploadBtn.classList.toggle("active", isUpload);
  modeManualBtn.classList.toggle("active", !isUpload);
  modeUploadBtn.setAttribute("aria-selected", String(isUpload));
  modeManualBtn.setAttribute("aria-selected", String(!isUpload));

  chrome.storage.local.set({ selectedMode: mode }).catch(() => {});
}

function cleanText(input = "") {
  return input
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function getAllFormData() {
  return Object.fromEntries(Object.entries(fields).map(([key, node]) => [key, node.value.trim()]));
}

function setAllFormData(data = {}) {
  allFieldIds.forEach((id) => {
    fields[id].value = typeof data[id] === "string" ? data[id] : "";
  });
}

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function extractPhone(text) {
  const match = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function extractName(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.find((line) =>
    line.length > 2 &&
    line.length < 45 &&
    !line.includes("@") &&
    !/\d{3,}/.test(line) &&
    /^[A-Za-z.,' -]+$/.test(line)
  ) || "";
}

function extractSkills(text) {
  const lower = text.toLowerCase();
  return skillBank.filter((skill) => lower.includes(skill.toLowerCase()));
}

function extractJobTitle(jd) {
  const patterns = [
    /job title\s*[:\-]\s*([^\n]+)/i,
    /position\s*[:\-]\s*([^\n]+)/i,
    /role\s*[:\-]\s*([^\n]+)/i
  ];
  for (const pattern of patterns) {
    const match = jd.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function extractCompany(jd) {
  const match = jd.match(/\bat\s+([A-Z][A-Za-z0-9&.,\- ]{2,40})/);
  return match ? match[1].trim() : "";
}

function extractExperienceLine(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => /\b(years?|experience|developed|built|led|managed|delivered)\b/i.test(line)) || "";
}

function getManualPayload() {
  return {
    name: fields.name.value.trim(),
    phone: fields.phone.value.trim(),
    email: fields.email.value.trim(),
    company: fields.company.value.trim(),
    address: fields.address.value.trim(),
    manager: fields.manager.value.trim(),
    job: fields.job.value.trim(),
    subject: fields.subject.value.trim(),
    experience: fields.experience.value.trim(),
    skills: fields.skills.value.trim(),
    jd: fields.jobDescriptionManual.value.trim()
  };
}

function getUploadPayload() {
  const resumeText = cleanText(uploadedResumeText);
  const jd = cleanText(fields.jobDescriptionUpload.value);
  const resumeSkills = extractSkills(resumeText);
  const jdSkills = extractSkills(jd);

  const name = extractName(resumeText) || "Applicant";
  const email = extractEmail(resumeText);
  const phone = extractPhone(resumeText);
  const job = extractJobTitle(jd) || "the role";
  const company = extractCompany(jd) || "your organization";
  const manager = "Hiring Manager";
  const address = "";
  const subject = `Application for ${job}`;
  const experience = extractExperienceLine(resumeText);
  const skills = resumeSkills.length ? resumeSkills.join(", ") : "";

  return {
    name,
    email,
    phone,
    company,
    address,
    manager,
    job,
    subject,
    experience,
    skills,
    jd,
    resumeSkills,
    jdSkills
  };
}

function buildLetter(payload) {
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const resumeSkills = payload.resumeSkills || extractSkills(payload.skills || "");
  const jdSkills = payload.jdSkills || extractSkills(payload.jd || "");
  const matched = resumeSkills.filter((s) => jdSkills.includes(s));
  const topSkills = (matched.length ? matched : resumeSkills).slice(0, 7);

  const experienceLine = payload.experience
    ? `With ${payload.experience}, I have consistently delivered measurable outcomes.`
    : "I have delivered high-quality outcomes through ownership, collaboration, and strong execution.";

  const skillsLine = topSkills.length
    ? `My strongest role-relevant skills include ${topSkills.join(", ")}.`
    : "My strengths include communication, adaptability, and problem solving.";

  const jdLine = payload.jd
    ? "After reviewing your job description, I am confident my profile aligns with your expectations."
    : "I am confident my profile aligns with your expectations.";

  const lines = [
    payload.name,
    payload.phone,
    payload.email,
    "",
    today,
    "",
    payload.manager || "Hiring Manager",
    payload.company,
    payload.address,
    "",
    `Subject: ${payload.subject || `Application for ${payload.job}`}`,
    "",
    `Dear ${payload.manager || "Hiring Manager"},`,
    "",
    `I am writing to express my interest in ${payload.job} at ${payload.company}.`,
    jdLine,
    experienceLine,
    skillsLine,
    "I would welcome the opportunity to discuss how I can contribute to your team goals.",
    "",
    "Sincerely,",
    payload.name
  ];

  return lines.filter((line, index, arr) => {
    if (line !== "") return true;
    return arr[index - 1] !== "";
  }).join("\n");
}

async function analyzeInputs() {
  if (currentMode === "manual") {
    const manual = getManualPayload();
    if (!manual.jd && !manual.skills && !manual.experience) {
      showStatus("Add JD, skills, or experience for better manual tailoring.", true);
      return;
    }
    showStatus("Manual inputs ready. Generate letter now.");
    await persistState();
    return;
  }

  if (!uploadedResumeText && !fields.jobDescriptionUpload.value.trim()) {
    showStatus("Upload resume file and add JD first.", true);
    return;
  }

  await persistState();
  showStatus("Upload mode analyzed. Click Generate Letter.");
}

async function generateLetter() {
  let payload;
  if (currentMode === "manual") {
    payload = getManualPayload();
    if (!payload.name || !payload.job || !payload.company) {
      showStatus("Manual mode requires Name, Job Title, and Company.", true);
      return;
    }
  } else {
    payload = getUploadPayload();
    if (!payload.jd && !uploadedResumeText) {
      showStatus("Upload mode requires resume file or job description.", true);
      return;
    }
  }

  const letter = buildLetter(payload);
  updateOutputState(letter);
  await persistState({ lastLetter: letter });
  showStatus("Cover letter generated successfully.");
}

async function copyLetter() {
  const text = output.textContent.trim();
  if (!text || text === "No letter generated yet.") {
    showStatus("Generate a letter first.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showStatus("Copied to clipboard.");
  } catch {
    showStatus("Clipboard access blocked.", true);
  }
}

function downloadLetter() {
  const text = output.textContent.trim();
  if (!text || text === "No letter generated yet.") {
    showStatus("Generate a letter first.", true);
    return;
  }

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cover-letter.txt";
  link.click();
  URL.revokeObjectURL(url);
  showStatus("Downloaded as cover-letter.txt.");
}

async function persistState(extra = {}) {
  await chrome.storage.local.set({
    formData: getAllFormData(),
    selectedMode: currentMode,
    resumeMeta: resumeMetaEl.textContent,
    uploadedResumeText,
    ...extra
  });
}

async function resetAll() {
  setAllFormData();
  uploadedResumeText = "";
  resumeFileInput.value = "";
  resumeMetaEl.textContent = "No resume file selected.";
  updateOutputState("");
  await chrome.storage.local.remove(["formData", "selectedMode", "resumeMeta", "lastLetter", "uploadedResumeText"]);
  setMode("upload");
  showStatus("All inputs cleared.");
}

async function restoreState() {
  const { formData, selectedMode, resumeMeta, lastLetter, uploadedResumeText: savedResumeText } = await chrome.storage.local.get([
    "formData", "selectedMode", "resumeMeta", "lastLetter", "uploadedResumeText"
  ]);

  if (formData && typeof formData === "object") setAllFormData(formData);
  if (typeof selectedMode === "string" && (selectedMode === "upload" || selectedMode === "manual")) setMode(selectedMode);
  if (typeof resumeMeta === "string" && resumeMeta.trim()) resumeMetaEl.textContent = resumeMeta;
  if (typeof savedResumeText === "string") uploadedResumeText = savedResumeText;

  updateOutputState(typeof lastLetter === "string" ? lastLetter : "");
}

function bindAutoSave() {
  allFieldIds.forEach((id) => {
    fields[id].addEventListener("input", () => {
      persistState().catch(() => showStatus("Autosave failed.", true));
    });
  });
}

async function handleResumeUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    resumeMetaEl.textContent = "No resume file selected.";
    return;
  }

  const extension = (file.name.split(".").pop() || "").toLowerCase();
  let text = "";

  try {
    if (["txt", "md", "rtf", "json"].includes(extension)) {
      text = await file.text();
    } else {
      const buffer = await file.arrayBuffer();
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      text = decoded;
    }

    text = cleanText(text);
    uploadedResumeText = text;

    const kb = Math.max(1, Math.floor(file.size / 1024));
    resumeMetaEl.textContent = `${file.name} loaded (${kb} KB)`;

    if (extension === "pdf" || extension === "doc" || extension === "docx") {
      showStatus("Resume imported. If text extraction is weak, try a TXT export for best result.", false);
    } else {
      showStatus("Resume file loaded. Now paste JD and generate.", false);
    }

    await persistState();
  } catch {
    showStatus("Could not read selected file.", true);
  }
}

modeUploadBtn.addEventListener("click", () => setMode("upload"));
modeManualBtn.addEventListener("click", () => setMode("manual"));

analyzeBtn.addEventListener("click", () => {
  analyzeInputs().catch(() => showStatus("Analysis failed.", true));
});
generateBtn.addEventListener("click", () => {
  generateLetter().catch(() => showStatus("Generation failed.", true));
});
copyBtn.addEventListener("click", () => {
  copyLetter().catch(() => showStatus("Copy failed.", true));
});
downloadBtn.addEventListener("click", downloadLetter);
resetBtn.addEventListener("click", () => {
  resetAll().catch(() => showStatus("Reset failed.", true));
});
resumeFileInput.addEventListener("change", (event) => {
  handleResumeUpload(event).catch(() => showStatus("File import failed.", true));
});

bindAutoSave();
restoreState().catch(() => {
  updateOutputState("");
  setMode("upload");
  showStatus("Could not restore saved state.", true);
});
