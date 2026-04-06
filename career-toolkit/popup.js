document.addEventListener('DOMContentLoaded', () => {
    // ---- Constants ----
    const GEMINI_API_KEY = "REPLACED_BY_USER_WITH_SECRET_KEY"; // Placeholder to prevent leakage
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // ---- DOM Elements ----
    const extractBtn = document.getElementById('extractBtn');
    const jobDescriptionEl = document.getElementById('jobDescription');
    const resumeTextEl = document.getElementById('resumeText');
    const statusMessage = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Resume Match Tab
    const analyzeResumeBtn = document.getElementById('analyzeResumeBtn');
    const resumeResults = document.getElementById('resumeResults');
    const atsScoreEl = document.getElementById('atsScore');
    const foundKeywordsEl = document.getElementById('foundKeywords');
    const missingKeywordsEl = document.getElementById('missingKeywords');
    const suggestedBulletsEl = document.getElementById('suggestedBullets');
    const roleFitSummaryEl = document.getElementById('roleFitSummary');
    const exportResumeBtn = document.getElementById('exportResumeBtn');

    // Cover Letter Tab
    const toneSelect = document.getElementById('toneSelect');
    const structureSelect = document.getElementById('structureSelect');
    const generateLetterBtn = document.getElementById('generateLetterBtn');
    const coverLetterResults = document.getElementById('coverLetterResults');
    const coverLetterOutput = document.getElementById('coverLetterOutput');
    const copyLetterBtn = document.getElementById('copyLetterBtn');
    const exportLetterBtn = document.getElementById('exportLetterBtn');
    const companyResearchBtn = document.getElementById('companyResearchBtn');

    // ---- Initialization & Storage ----
    chrome.storage.local.get(['savedJD', 'savedResume'], (data) => {
        if (data.savedJD) jobDescriptionEl.value = data.savedJD;
        if (data.savedResume) resumeTextEl.value = data.savedResume;
    });

    const saveData = () => {
        chrome.storage.local.set({
            savedJD: jobDescriptionEl.value,
            savedResume: resumeTextEl.value
        });
    };

    jobDescriptionEl.addEventListener('input', saveData);
    resumeTextEl.addEventListener('input', saveData);

    // ---- UI Utilities ----
    let statusTimeout;
    const showStatus = (msg, isError = false) => {
        if (statusTimeout) clearTimeout(statusTimeout);
        
        statusText.textContent = msg;
        statusMessage.classList.toggle('error', isError);
        statusMessage.classList.remove('hidden');

        statusTimeout = setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 4000);
    };

    // ---- Tab Logic ----
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // ---- Extraction Logic ----
    extractBtn.addEventListener('click', () => {
        extractBtn.textContent = '⏳ Extracting...';
        extractBtn.disabled = true;

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (!tabs[0]) {
                showStatus('No active tab found', true);
                resetExtractBtn();
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, {action: "scrapeContent"}, (response) => {
                if (chrome.runtime.lastError) {
                    chrome.scripting.executeScript({
                        target: {tabId: tabs[0].id},
                        files: ['content.js']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            showStatus('Failed to load extraction tool.', true);
                            resetExtractBtn();
                            return;
                        }
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabs[0].id, {action: "scrapeContent"}, (resp) => {
                                handleExtractResponse(resp);
                            });
                        }, 500);
                    });
                    return;
                }
                handleExtractResponse(response);
            });
        });
    });

    const resetExtractBtn = () => {
        extractBtn.textContent = '🌐 Auto-Extract';
        extractBtn.disabled = false;
    };

    const handleExtractResponse = (response) => {
        resetExtractBtn();
        if (response) {
            let updated = false;
            if (response.jobDescription && response.jobDescription.trim() !== '') {
                jobDescriptionEl.value = response.jobDescription;
                updated = true;
            }
            if (response.resumeText && response.resumeText.trim() !== '') {
                resumeTextEl.value = response.resumeText;
                updated = true;
            }
            
            if (updated) {
                saveData();
                showStatus('Content extracted from page successfully!');
            } else {
                showStatus('No content found on this page.', true);
            }
        } else {
            showStatus('Failed to extract content.', true);
        }
    };


    // ---- Gemini API Logic ----
    async function askGemini(prompt, isJSON = false) {
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
               responseMimeType: isJSON ? "application/json" : "text/plain"
            }
        };
        
        const response = await fetch(GEMINI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        
        if (isJSON) {
            try {
                return JSON.parse(textResponse);
            } catch(e) {
                // fallback to finding JSON block
                const match = textResponse.match(/```json\n([\s\S]*?)\n```/);
                if (match) return JSON.parse(match[1]);
                throw new Error("Invalid JSON Returned from AI");
            }
        }
        
        return textResponse;
    }


    // ---- Resume Match Logic ----
    let currentAnalysisReport = "";

    analyzeResumeBtn.addEventListener('click', async () => {
        const jd = jobDescriptionEl.value.trim();
        const resume = resumeTextEl.value.trim();

        if (!jd || !resume) {
            showStatus('Please provide both Job Description and Resume Text.', true);
            return;
        }

        const originalBtnText = analyzeResumeBtn.textContent;
        analyzeResumeBtn.innerHTML = '🤖 Analyzing via AI...'; // visual loading indicator
        analyzeResumeBtn.disabled = true;

        const prompt = `You are an expert HR ATS System. Analyze the provided resume against the provided job description.
        Please return a JSON strictly matching this schema:
        {
          "score": <number between 0 and 100 based on keyword match and experience alignment>,
          "found_keywords": [<array of string, up to 15 important matched technical/soft skills>],
          "missing_keywords": [<array of string, up to 15 important missing skills or terms from JD>],
          "suggested_bullets": [<array of 2-3 strings, actionable bullet points the user can copy-paste into their resume to cover the missing skills based on their evident past experience>],
          "role_fit": "<A 2-3 sentence summary of how well they fit the role, areas of concern, and overall verdict>"
        }
        
        Job Description:
        ${jd}

        Resume:
        ${resume}
        `;

        try {
            const aiData = await askGemini(prompt, true);
            
            // Extract & Display Data
            const score = aiData.score || 0;
            const found = aiData.found_keywords || [];
            const missing = aiData.missing_keywords || [];
            
            atsScoreEl.textContent = score;

            // Styling score
            const circle = document.querySelector('.score-circle');
            if (score >= 80) circle.style.background = 'var(--success)';
            else if (score >= 60) circle.style.background = 'var(--warning)';
            else circle.style.background = 'var(--danger)';

            // Populate lists
            foundKeywordsEl.innerHTML = found.map(w => `<li>✓ ${w}</li>`).join('');
            missingKeywordsEl.innerHTML = missing.map(w => `<li><span class="keyword-icon-red">✗</span> ${w}</li>`).join('') || "<li>No major missing keywords!</li>";

            // Suggestions
            if (aiData.suggested_bullets && aiData.suggested_bullets.length > 0) {
                suggestedBulletsEl.innerHTML = `<ul>${aiData.suggested_bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
            } else {
                suggestedBulletsEl.innerHTML = "Looking good! You've hit the main keywords.";
            }

            // Role Fit
            roleFitSummaryEl.textContent = aiData.role_fit || "";

            currentAnalysisReport = `Career Toolkit ATS AI Report\n\nScore: ${score}%\n\nFound Keywords:\n${found.join(', ')}\n\nMissing Keywords:\n${missing.slice(0,10).join(', ')}\n\nFit: ${aiData.role_fit}`;

            resumeResults.classList.remove('hidden');
            showStatus('Analysis Complete.');
        } catch (error) {
            console.error(error);
            showStatus('AI Analysis failed. Check API key or try again.', true);
        } finally {
            analyzeResumeBtn.textContent = originalBtnText;
            analyzeResumeBtn.disabled = false;
        }
    });

    exportResumeBtn.addEventListener('click', () => {
        downloadTxt('ats-report.txt', currentAnalysisReport);
    });


    // ---- Cover Letter Logic ----
    generateLetterBtn.addEventListener('click', async () => {
        const jd = jobDescriptionEl.value.trim();
        const resume = resumeTextEl.value.trim();

        if (!jd || !resume) {
            showStatus('Please provide both Job Description and Resume Text.', true);
            return;
        }

        const tone = toneSelect.value;
        const structure = structureSelect.value;
        
        const originalBtnText = generateLetterBtn.textContent;
        generateLetterBtn.innerHTML = '🤖 Writing Letter...';
        generateLetterBtn.disabled = true;

        const dateString = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

        const prompt = `You are an expert career coach writing a highly personalized cover letter for a candidate. 
        Write the letter using the provided Resume and Job Description.
        
        Guidelines:
        - Strict Length Limit: The cover letter must be between 250 and 300 words (approximately 3 to 4 concise paragraphs). Make it highly professional, targeted, and optimized.
        - Date at the top: ${dateString}
        - Tone: ${tone} (e.g. Formal, Confident, Conversational, Creative).
        - Structure style: ${structure} (Classic, Problem-Solution, Story-Driven).
        - Connect the candidate's actual experience from their resume to the exact requirements of the JD.
        - Only output the cover letter text itself, no intro/outro chat.
        - Include placeholders like "[Hiring Manager's Name]" if not found in the JD.

        Job Description:
        ${jd}

        Resume:
        ${resume}
        `;

        try {
            const letter = await askGemini(prompt, false);
            coverLetterOutput.value = letter.trim();
            coverLetterResults.classList.remove('hidden');
            showStatus('Cover letter generated.');
        } catch (error) {
             console.error(error);
             showStatus('AI Generation failed.', true);
        } finally {
            generateLetterBtn.textContent = originalBtnText;
            generateLetterBtn.disabled = false;
        }
    });

    copyLetterBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(coverLetterOutput.value).then(() => showStatus('Copied!'));
    });

    exportLetterBtn.addEventListener('click', () => {
        downloadTxt('cover-letter.txt', coverLetterOutput.value);
    });

    companyResearchBtn.addEventListener('click', () => {
        const jd = jobDescriptionEl.value.trim();
        const prompt = `I am preparing for an interview based on the following Job Description. Could you provide a summary of the hiring company's core values, recent news, their main products/services, and suggest 3 insightful questions I could ask the interviewer?\n\nJob Description:\n${jd.substring(0, 500)}...`;
        navigator.clipboard.writeText(prompt).then(() => showStatus('Research prompt copied to clipboard! Paste it into a new AI chat.'));
    });

    // Helper
    function downloadTxt(filename, text) {
        if (!text) return;
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
});