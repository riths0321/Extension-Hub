"use strict";

/*  Content script — SAFE VERSION
Only reads visible text
Does NOT modify webpage
*/

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
if (request.action === "scrapeContent") {
sendResponse(extractPageContent());
}
return true;
});

function extractPageContent() {

let jobDescription = "";
let resumeText = "";

const jdSelectors = [
    '.description__text','.show-more-less-html__markup','.jobs-description__content',
    '#jobDescriptionText','.job-desc','.job-description','.description','main','article'
];

const resumeSelectors = [
    'textarea','.resume','#resume','.resume-content','[contenteditable="true"]'
];

function visibleText(el){
    if(!el) return "";
    return (el.innerText || "").replace(/\s+/g," ").trim();
}

/* -------- Job Description -------- */
for(const sel of jdSelectors){
    const els=document.querySelectorAll(sel);
    for(const el of els){
        const text=visibleText(el);
        if(text.length>200 && /(responsibilit|requirement|qualification|experience|skill)/i.test(text)){
            jobDescription=text;
            break;
        }
    }
    if(jobDescription) break;
}

/* fallback largest block */
if(!jobDescription){
    let largest="";
    document.querySelectorAll("div,section,article,main").forEach(el=>{
        const t=visibleText(el);
        if(t.length>largest.length && t.length<20000) largest=t;
    });
    jobDescription=largest;
}

/* -------- Resume -------- */
for(const sel of resumeSelectors){
    const els=document.querySelectorAll(sel);
    for(const el of els){
        const text=el.value || visibleText(el);
        if(text.length>100 && /(experience|education|skills|projects)/i.test(text)){
            resumeText=text;
            break;
        }
    }
    if(resumeText) break;
}

return {
    jobDescription: clean(jobDescription),
    resumeText: clean(resumeText)
};

}

function clean(t){
return (t||"").replace(/\s+/g," ").trim();
}
