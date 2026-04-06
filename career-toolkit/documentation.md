# Career Toolkit Extension

**Version:** 1.0.0
**Description:** All-in-one suite to analyze resume ATS compatibility and generate tailored cover letters.

## Features
- **Global Inputs:** "Single paste zone" for job description and resume text.
- **Auto-Extract:** Scrapes job portals automatically to get the job description without copying and pasting manually.
- **Gemini AI Resume Analyzer:** Features an intelligent AI-calculated ATS matching score dial, Contextual Skill Gap classifier, custom bullet point generation based on your resume, and a comprehensive role fit summary.
- **Gemini AI Cover Letter Studio:** Fully AI-generated and highly organic letters written by Gemini 1.5 Flash using Tone/Structure parameters aligned with the provided inputs. Includes 1-click clipboard and export functionality.
- **Company Research Prompt:** Generate interview research prompts with a single click.

## File Structure Structure
- `manifest.json`: Configuration for permissions.
- `popup.html` & `style.css`: Unified UI with tab structure and Loading States.
- `popup.js`: Asynchronous Gemini API integration, JSON parsing logic, and DOM interaction.
- `content.js` & `background.js`: Content scraping scripts ported from the previous Resume Keyword Checker.