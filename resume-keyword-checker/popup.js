"use strict";

document.addEventListener("DOMContentLoaded", () => {

const $ = id => document.getElementById(id);

const jobDescription = $("jobDescription");
const resumeText = $("resumeText");
const analyzeBtn = $("analyzeBtn");
const clearBtn = $("clearBtn");
const scrapeBtn = $("scrapeBtn");
const results = $("results");
const scoreElement = $("score");
const foundKeywordsList = $("foundKeywords");
const missingKeywordsList = $("missingKeywords");
const suggestionsElement = $("suggestions");
const summaryElement = $("summaryText");

let scraping = false;

/* ---------------- THEME ---------------- */

const themeToggle = $("themeToggle");
const themeDropdown = $("themeDropdown");
const themeOptions = document.querySelectorAll(".theme-option");

chrome.storage.local.get(["selectedTheme"], data => {
if (data.selectedTheme) {
document.body.dataset.theme = data.selectedTheme;
updateThemeButton(data.selectedTheme);
}
});

themeToggle.addEventListener("click", e => {
e.stopPropagation();
themeDropdown.classList.toggle("show");
});

document.addEventListener("click", () => themeDropdown.classList.remove("show"));

themeOptions.forEach(opt => {
opt.addEventListener("click", () => {
const theme = opt.dataset.theme;
document.body.dataset.theme = theme;
chrome.storage.local.set({ selectedTheme: theme });
updateThemeButton(theme);
themeDropdown.classList.remove("show");
});
});

function updateThemeButton(theme){
const icons={
"ocean-blue":"🌊",
"mint-teal":"🌿",
"indigo-night":"🌙",
"sky-gradient":"☁️",
"violet-glow":"✨"
};
themeToggle.textContent = icons[theme] || "🎨";
}

/* ---------------- STORAGE ---------------- */

chrome.storage.local.get(["savedJD","savedResume"], data=>{
if(data.savedJD) jobDescription.value=data.savedJD;
if(data.savedResume) resumeText.value=data.savedResume;
});

/* ---------------- BUTTONS ---------------- */

analyzeBtn.addEventListener("click", ()=>{
const jd=jobDescription.value.trim().toLowerCase();
const resume=resumeText.value.trim().toLowerCase();
if(!jd||!resume) return alert("Enter both fields");

chrome.storage.local.set({savedJD:jobDescription.value,savedResume:resumeText.value});
analyzeKeywords(jd,resume);


});

clearBtn.addEventListener("click",()=>{
jobDescription.value="";
resumeText.value="";
chrome.storage.local.remove(["savedJD","savedResume"]);
results.classList.add("hidden");
});

/* ---------------- SCRAPER ---------------- */

scrapeBtn.addEventListener("click", ()=>{
scraping=true;
scrapeBtn.textContent="⏳ Extracting...";
scrapeBtn.disabled=true;

chrome.tabs.query({active:true,currentWindow:true}, tabs=>{
    if(!tabs[0]) return finishScrape("No active tab");

    chrome.tabs.sendMessage(tabs[0].id,{action:"scrapeContent"},res=>{
        if(chrome.runtime.lastError){
            finishScrape("Refresh page and try again");
            return;
        }

        if(res?.jobDescription) jobDescription.value=res.jobDescription;
        if(res?.resumeText) resumeText.value=res.resumeText;

        chrome.storage.local.set({savedJD:jobDescription.value,savedResume:resumeText.value||""});
        finishScrape("Content extracted");
    });
});

setTimeout(()=>{
    if(scraping) finishScrape("Timeout");
},10000);

});

function finishScrape(msg){
scraping=false;
scrapeBtn.textContent="🌐 Extract from Page";
scrapeBtn.disabled=false;
showNotice(msg);
}

/* ---------------- ANALYSIS ---------------- */

function analyzeKeywords(jd,resume){
const jdWords=extractKeywords(jd);
const resumeWords=extractKeywords(resume);

const found=[];
const missing=[];

jdWords.forEach(w=>resumeWords.includes(w)?found.push(w):missing.push(w));

const score=Math.round((found.length/jdWords.length)*100)||0;

displayResults(score,found,missing,jdWords.length);
generateSuggestions(found,missing);
results.classList.remove("hidden");


}

function extractKeywords(text){
const stop=["the","and","or","but","in","on","at","to","for","of","with","by","a","an","is","are","was","were"];
return [...new Set(text.replace(/[^\w\s]/g," ").split(/\s+/).filter(w=>w.length>2&&!stop.includes(w)))].sort();
}

/* ---------------- RESULTS ---------------- */

function displayResults(score,found,missing,total){
scoreElement.textContent=score;

foundKeywordsList.replaceChildren();
missingKeywordsList.replaceChildren();

found.slice(0,20).forEach(k=>{
    const li=document.createElement("li");
    li.textContent="✓ "+k;
    foundKeywordsList.appendChild(li);
});

missing.slice(0,20).forEach(k=>{
    const li=document.createElement("li");
    li.textContent="✗ "+k;
    missingKeywordsList.appendChild(li);
});

summaryElement.replaceChildren();
addLine(`Total keywords: ${total}`);
addLine(`Found: ${found.length}`);
addLine(`Missing: ${missing.length}`);
addLine(`Match rate: ${score}%`);

if(score>=80) addLine("Great ATS compatibility");
else if(score>=60) addLine("Needs improvements");
else addLine("Major improvements required");


}

function addLine(t){
const p=document.createElement("p");
p.textContent=t;
summaryElement.appendChild(p);
}

/* ---------------- SUGGESTIONS ---------------- */

function generateSuggestions(found,missing){
suggestionsElement.replaceChildren();

const title=document.createElement("p");
title.textContent="Recommendations";
title.style.fontWeight="bold";

const ul=document.createElement("ul");

const add=t=>{
    const li=document.createElement("li");
    li.textContent=t;
    ul.appendChild(li);
};

if(missing.length) add("Add missing keywords: "+missing.slice(0,10).join(", "));
if(found.length<15) add("Add more technical skills");
add("Use keywords naturally");
add("Repeat important keywords");
add("Include soft skills");

suggestionsElement.append(title,ul);


}

/* ---------------- NOTICE ---------------- */

function showNotice(msg){
let box=$("noticeBox");
if(!box){
box=document.createElement("div");
box.id="noticeBox";
box.className="notice";
document.querySelector(".container").appendChild(box);
}
box.textContent=msg;
setTimeout(()=>box.remove(),3000);
}

});
