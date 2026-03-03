const fieldIds = [
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
  "resumeText",
  "jobDescription"
];

const fields = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id)]));
const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const charCountEl = document.getElementById("charCount");
const resumeMetaEl = document.getElementById("resumeMeta");
const resumeFileInput = document.getElementById("resumeFile");

const generateBtn = document.getElementById("generate");
const analyzeBtn = document.getElementById("analyze");
const copyBtn = document.getElementById("copy");
const downloadBtn = document.getElementById("download");
const resetBtn = document.getElementById("reset");

const skillBank = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "SQL",
  "HTML", "CSS", "Tailwind", "Angular", "Vue", "Next.js", "AWS", "Docker",
  "Kubernetes", "Git", "REST API", "GraphQL", "Testing", "Jest", "Cypress",
  "Figma", "UI/UX", "Agile", "Scrum", "Communication", "Leadership"
];

function getFormData() {
  return Object.fromEntries(
    Object.entries(fields).map(([key, node]) => [key, node.value.trim()])
  );
}

function setFormData(data = {}) {
  fieldIds.forEach((id) => {
    fields[id].value = typeof data[id] === "string" ? data[id] : "";
  });
}

function fillIfEmpty(fieldId, value) {
  if (!value) return;
  if (!fields[fieldId].value.trim()) {
    fields[fieldId].value = value;
  }
}

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

function cleanText(input) {
  return input.replace(/\r/g, "").replace(/\t/g, " ").replace(/\u0000/g, "").trim();
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

function extractExperienceLine(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const experienceLine = lines.find((line) =>
    /\b(years?|experience|worked|built|developed|managed|led)\b/i.test(line)
  );
  return experienceLine || "";
}

function extractJobHintsFromJD(text) {
  const titleMatch = text.match(/\b(role|position|job title)\b[^\n:]*[:\-]\s*([^\n]+)/i);
  const companyMatch = text.match(/\bat\s+([A-Z][A-Za-z0-9&.,\- ]{2,40})/);
  const jdSkills = extractSkills(text);

  return {
    title: titleMatch ? titleMatch[2].trim() : "",
    company: companyMatch ? companyMatch[1].trim() : "",
    jdSkills
  };
}

function parseResumeAndJD(resumeText, jobDescription) {
  const cleanResume = cleanText(resumeText);
  const cleanJD = cleanText(jobDescription);

  const resumeSkills = extractSkills(cleanResume);
  const experienceLine = extractExperienceLine(cleanResume);
  const jdHints = extractJobHintsFromJD(cleanJD);

  return {
    name: extractName(cleanResume),
    email: extractEmail(cleanResume),
    phone: extractPhone(cleanResume),
    experienceLine,
    resumeSkills,
    jdTitle: jdHints.title,
    jdCompany: jdHints.company,
    jdSkills: jdHints.jdSkills
  };
}

function buildLetter(data, intelligence) {
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const overlapSkills = intelligence.resumeSkills.filter((skill) =>
    intelligence.jdSkills.includes(skill)
  );

  const selectedSkills = overlapSkills.length
    ? overlapSkills
    : (data.skills ? data.skills.split(",").map((s) => s.trim()).filter(Boolean) : intelligence.resumeSkills);

  const capabilityLine = selectedSkills.length
    ? `My strongest matching capabilities for this role include ${selectedSkills.slice(0, 7).join(", ")}.`
    : "I bring strong ownership, communication, and execution discipline aligned with the role requirements.";

  const jdLine = data.jobDescription
    ? "After reviewing the job description, I am confident my background aligns closely with your expectations."
    : "I am confident my background aligns closely with your expectations.";

  const experienceLine = data.experience || intelligence.experienceLine ||
    "I have delivered measurable outcomes by collaborating across teams and shipping high-quality work.";

  const lines = [
    data.name,
    data.phone,
    data.email,
    "",
    today,
    "",
    data.manager || "Hiring Manager",
    data.company,
    data.address,
    "",
    `Subject: ${data.subject || `Application for ${data.job}`}`,
    "",
    `Dear ${data.manager || "Hiring Manager"},`,
    "",
    `I am writing to express my interest in the ${data.job} position at ${data.company}.`,
    jdLine,
    experienceLine,
    capabilityLine,
    "I would welcome the opportunity to discuss how I can contribute to your team goals.",
    "",
    "Sincerely,",
    data.name
  ];

  return lines.filter((line, index, arr) => {
    if (line !== "") return true;
    return arr[index - 1] !== "";
  }).join("\n");
}

async function saveDraftState(extra = {}) {
  const payload = {
    formData: getFormData(),
    resumeMeta: resumeMetaEl.textContent,
    ...extra
  };
  await chrome.storage.local.set(payload);
}

async function analyzeInputs() {
  const data = getFormData();
  if (!data.resumeText && !data.jobDescription) {
    showStatus("Resume text or Job Description required for analysis.", true);
    return;
  }

  const intelligence = parseResumeAndJD(data.resumeText, data.jobDescription);
  fillIfEmpty("name", intelligence.name);
  fillIfEmpty("email", intelligence.email);
  fillIfEmpty("phone", intelligence.phone);
  fillIfEmpty("job", intelligence.jdTitle);
  fillIfEmpty("company", intelligence.jdCompany);
  fillIfEmpty("experience", intelligence.experienceLine);

  if (!fields.skills.value.trim() && intelligence.resumeSkills.length) {
    fields.skills.value = intelligence.resumeSkills.slice(0, 10).join(", ");
  }

  await saveDraftState();
  showStatus("Analysis complete. Fields auto-filled where possible.");
}

async function generateLetter() {
  const data = getFormData();

  if (!data.name || !data.job || !data.company) {
    showStatus("Full Name, Job Title, and Company are required.", true);
    return;
  }

  const intelligence = parseResumeAndJD(data.resumeText, data.jobDescription);
  const letter = buildLetter(data, intelligence);

  updateOutputState(letter);
  await saveDraftState({ lastLetter: letter });
  showStatus("Tailored cover letter generated and saved.");
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
    showStatus("Clipboard permission blocked. Try again.", true);
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

async function resetAll() {
  setFormData();
  updateOutputState("");
  resumeFileInput.value = "";
  resumeMetaEl.textContent = "No resume file selected.";
  await chrome.storage.local.remove(["formData", "lastLetter", "resumeMeta"]);
  showStatus("All data cleared.");
}

async function restoreState() {
  const { formData, lastLetter, resumeMeta } = await chrome.storage.local.get([
    "formData",
    "lastLetter",
    "resumeMeta"
  ]);

  if (formData && typeof formData === "object") {
    setFormData(formData);
  }

  if (typeof resumeMeta === "string" && resumeMeta.trim()) {
    resumeMetaEl.textContent = resumeMeta;
  }

  updateOutputState(typeof lastLetter === "string" ? lastLetter : "");
}

function bindAutoSave() {
  fieldIds.forEach((id) => {
    fields[id].addEventListener("input", () => {
      saveDraftState().catch(() => {
        showStatus("Draft auto-save failed.", true);
      });
    });
  });
}

async function handleResumeUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    resumeMetaEl.textContent = "No resume file selected.";
    return;
  }

  const validName = /\.(txt|md|rtf|json)$/i.test(file.name);
  if (!validName) {
    showStatus("For best results use .txt/.md or paste PDF/DOCX text manually.", true);
    resumeMetaEl.textContent = `${file.name} selected (manual paste recommended)`;
    return;
  }

  try {
    const text = await file.text();
    fields.resumeText.value = cleanText(text);
    resumeMetaEl.textContent = `${file.name} loaded (${Math.max(1, Math.floor(file.size / 1024))} KB)`;
    await saveDraftState();
    showStatus("Resume text loaded. Now add JD and click Analyze.");
  } catch {
    showStatus("Could not read resume file.", true);
  }
}

generateBtn.addEventListener("click", () => {
  generateLetter().catch(() => showStatus("Failed to generate letter.", true));
});
analyzeBtn.addEventListener("click", () => {
  analyzeInputs().catch(() => showStatus("Analysis failed.", true));
});
copyBtn.addEventListener("click", () => {
  copyLetter().catch(() => showStatus("Copy failed.", true));
});
downloadBtn.addEventListener("click", downloadLetter);
resetBtn.addEventListener("click", () => {
  resetAll().catch(() => showStatus("Reset failed.", true));
});
resumeFileInput.addEventListener("change", (event) => {
  handleResumeUpload(event).catch(() => showStatus("File read failed.", true));
});

bindAutoSave();
restoreState().catch(() => {
  updateOutputState("");
  showStatus("Could not restore saved data.", true);
});
