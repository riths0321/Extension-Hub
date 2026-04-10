 // Comprehensive stopwords list
const stopWords = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'of', 'for', 'in', 'with', 'that', 'this', 'it', 'as', 'are',
  'was', 'were', 'by', 'be', 'or', 'from', 'if', 'then', 'than', 'but', 'about', 'into', 'over', 'under', 'not', 'can',
  'will', 'just', 'you', 'your', 'they', 'them', 'their', 'there', 'our', 'has', 'have', 'had', 'also', 'more', 'most',
  'such', 'these', 'those', 'its', 'who', 'what', 'when', 'where', 'why', 'how', 'very', 'after', 'before', 'above',
  'below', 'between', 'during', 'without', 'through', 'during', 'against', 'among', 'because', 'therefore', 'according',
  'across', 'although', 'however', 'moreover', 'otherwise', 'plus', 'than', 'thence', 'thereafter', 'thereby', 'wherein'
]);

// Sentiment word lists
const positiveWords = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'brilliant', 'perfect',
  'beautiful', 'love', 'like', 'happy', 'pleased', 'satisfied', 'recommend', 'best', 'top', 'quality',
  'valuable', 'helpful', 'useful', 'efficient', 'effective', 'powerful', 'innovative', 'advanced'
]);

const negativeWords = new Set([
  'bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointing', 'disappointed', 'worst', 'waste',
  'useless', 'broken', 'issue', 'problem', 'error', 'fail', 'failed', 'difficult', 'hard', 'complicated',
  'expensive', 'overpriced', 'slow', 'bug', 'bugs', 'crash', 'crashes', 'hate', 'annoying', 'frustrating'
]);

// DOM Elements
const textInput = document.getElementById('textInput');
const readPageBtn = document.getElementById('readPageBtn');
const extractBtn = document.getElementById('extractBtn');
const topCount = document.getElementById('topCount');
const ngramSize = document.getElementById('ngramSize');
const minWordLength = document.getElementById('minWordLength');
const minFrequency = document.getElementById('minFrequency');
const sourceTag = document.getElementById('sourceTag');
const statusText = document.getElementById('statusText');
const resultsEl = document.getElementById('results');
const copyResultsBtn = document.getElementById('copyResultsBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const exportBtn = document.getElementById('exportBtn');
const exportFormat = document.getElementById('exportFormat');
const saveHistoryBtn = document.getElementById('saveHistoryBtn');
const insightCard = document.getElementById('insightCard');
const insightText = document.getElementById('insightText');
const negativeKeywordsInput = document.getElementById('negativeKeywords');
const wordCloudCanvas = document.getElementById('wordCloudCanvas');
const downloadCloudBtn = document.getElementById('downloadCloudBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const statsBar = document.getElementById('statsBar');
const totalWordsSpan = document.getElementById('totalWords');
const uniqueKeywordsSpan = document.getElementById('uniqueKeywords');
const avgDensitySpan = document.getElementById('avgDensity');

// Tab elements
const tabResults = document.getElementById('tabResults');
const tabCloud = document.getElementById('tabCloud');
const tabNgrams = document.getElementById('tabNgrams');
const tabSentiment = document.getElementById('tabSentiment');
const tabSEO = document.getElementById('tabSEO');
const tabHistory = document.getElementById('tabHistory');
const resultsTab = document.getElementById('resultsTab');
const cloudTab = document.getElementById('cloudTab');
const ngramsTab = document.getElementById('ngramsTab');
const sentimentTab = document.getElementById('sentimentTab');
const seoTab = document.getElementById('seoTab');
const historyTab = document.getElementById('historyTab');
const ngramsResults = document.getElementById('ngramsResults');
const exportSeoBtn = document.getElementById('exportSeoBtn');

let cachedPageText = '';
let currentKeywords = [];
let currentNgrams = [];
let currentSentiment = null;
let currentFilter = 'all';
let currentTotalWords = 0;
let currentUniqueWords = 0;
let currentAvgDensity = 0;
let currentSeoScore = null;
let currentRecommendations = [];

const PAGE_TEXT_PREVIEW_LIMIT = 3000;

// Load history from storage
let history = [];

function loadHistory() {
  chrome.storage.local.get(['keywordHistory'], (result) => {
    history = result.keywordHistory || [];
    renderHistory();
  });
}

function saveToHistory() {
  if (!currentKeywords.length) {
    statusText.innerHTML = `<span class="status-icon status-warning"></span> No keywords to save`;
    return;
  }
  
  const historyItem = {
    id: Date.now(),
    date: new Date().toISOString(),
    keywords: [...currentKeywords],
    ngrams: [...currentNgrams],
    totalWords: currentTotalWords,
    uniqueWords: currentUniqueWords,
    avgDensity: currentAvgDensity,
    preview: currentKeywords.slice(0, 5).map(k => k.word).join(', ')
  };
  
  history.unshift(historyItem);
  if (history.length > 15) history.pop();
  
  chrome.storage.local.set({ keywordHistory: history }, () => {
    statusText.innerHTML = `<span class="status-icon status-success"></span> Saved to history!`;
    renderHistory();
    setTimeout(() => updateStatusMessage(), 1500);
  });
}

function renderHistory() {
  if (!historyList) return;
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty">No saved analyses yet. Extract keywords and click Save.</div>';
    return;
  }
  
  historyList.innerHTML = history.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-date">${new Date(item.date).toLocaleString()}</div>
      <div class="history-preview">${item.preview}</div>
      <div class="history-meta">
        ${item.keywords.length} keywords | ${item.totalWords} words | Density: ${item.avgDensity}%
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      const item = history.find(h => h.id === id);
      if (item) {
        currentKeywords = item.keywords;
        currentNgrams = item.ngrams || [];
        currentTotalWords = item.totalWords;
        currentUniqueWords = item.uniqueWords;
        currentAvgDensity = item.avgDensity;
        updateStatsBar();
        applyFilter();
        sourceTag.textContent = '📜 History';
        statusText.innerHTML = `<span class="status-icon status-success"></span> Loaded from history (${item.keywords.length} keywords)`;
        drawWordCloud();
        if (currentNgrams.length) renderNgrams();
        if (currentKeywords.length) renderSeoAnalysis();
        switchTab('results');
      }
    });
  });
}

clearHistoryBtn?.addEventListener('click', () => {
  if (confirm('Clear all saved history?')) {
    chrome.storage.local.set({ keywordHistory: [] }, () => {
      history = [];
      renderHistory();
      statusText.innerHTML = `<span class="status-icon status-success"></span> History cleared`;
      setTimeout(() => updateStatusMessage(), 1500);
    });
  }
});

function switchTab(tab) {
  tabResults.classList.toggle('active', tab === 'results');
  tabCloud.classList.toggle('active', tab === 'cloud');
  tabNgrams.classList.toggle('active', tab === 'ngrams');
  tabSentiment.classList.toggle('active', tab === 'sentiment');
  if (tabSEO) tabSEO.classList.toggle('active', tab === 'seo');
  tabHistory.classList.toggle('active', tab === 'history');
  
  resultsTab.style.display = tab === 'results' ? 'block' : 'none';
  cloudTab.style.display = tab === 'cloud' ? 'block' : 'none';
  ngramsTab.style.display = tab === 'ngrams' ? 'block' : 'none';
  sentimentTab.style.display = tab === 'sentiment' ? 'block' : 'none';
  if (seoTab) seoTab.style.display = tab === 'seo' ? 'block' : 'none';
  historyTab.style.display = tab === 'history' ? 'block' : 'none';
  
  if (tab === 'cloud' && currentKeywords.length) drawWordCloud();
  if (tab === 'ngrams' && currentNgrams.length) renderNgrams();
  if (tab === 'sentiment' && currentSentiment) renderSentiment();
  if (tab === 'seo' && currentKeywords.length) renderSeoAnalysis();
  if (tab === 'history') renderHistory();
}

tabResults?.addEventListener('click', () => switchTab('results'));
tabCloud?.addEventListener('click', () => switchTab('cloud'));
tabNgrams?.addEventListener('click', () => switchTab('ngrams'));
tabSentiment?.addEventListener('click', () => switchTab('sentiment'));
if (tabSEO) tabSEO?.addEventListener('click', () => switchTab('seo'));
tabHistory?.addEventListener('click', () => switchTab('history'));

const filterChips = document.querySelectorAll('.filter-chip');
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    applyFilter();
  });
});

function applyFilter() {
  if (!currentKeywords.length) {
    renderResults(currentKeywords);
    return;
  }
  let filtered = [...currentKeywords];
  if (currentFilter === 'long') {
    filtered = filtered.filter(kw => kw.word.length >= 6);
  } else if (currentFilter === 'short') {
    filtered = filtered.filter(kw => kw.word.length >= 3 && kw.word.length <= 5);
  }
  renderResults(filtered);
  updateInsight(filtered);
}

readPageBtn.addEventListener('click', readCurrentPageText);
extractBtn.addEventListener('click', extractKeywordsHandler);
copyResultsBtn.addEventListener('click', copyResultsToClipboard);
copyAllBtn?.addEventListener('click', copyAllToClipboard);
exportBtn.addEventListener('click', exportData);
saveHistoryBtn?.addEventListener('click', saveToHistory);
ngramSize?.addEventListener('change', () => {
  if (currentKeywords.length) extractKeywordsHandler();
});
downloadCloudBtn?.addEventListener('click', downloadWordCloud);
if (exportSeoBtn) exportSeoBtn?.addEventListener('click', exportSeoReport);

async function readCurrentPageText() {
  setLoading(true, '📄 Reading page content...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found');
    
    if (isRestrictedUrl(tab.url)) {
      throw new Error('restricted_page');
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageText
    });

    const text = String(result?.[0]?.result || '').replace(/\s+/g, ' ').trim();
    if (!text) throw new Error('No readable text found');

    cachedPageText = text;
    textInput.value = buildPageTextPreview(text);
    textInput.dataset.source = 'page';
    sourceTag.textContent = '🌐 Current Page';
    statusText.innerHTML = `<span class="status-icon status-success"></span> Loaded ${formatNumber(text.length)} characters`;
    resultsEl.innerHTML = '<div class="empty">Page text loaded. Click Extract Keywords to analyze it.</div>';
    setLoading(false);
  } catch (error) {
    let msg = getReadPageErrorMessage(error);
    statusText.innerHTML = `<span class="status-icon status-error"></span> ${msg}`;
    sourceTag.textContent = 'No data';
    setLoading(false);
  }
}

function isRestrictedUrl(url = '') {
  return /^(chrome|chrome-extension|edge|about|view-source|devtools):/.test(url);
}

function getReadPageErrorMessage(error) {
  const message = String(error?.message || '');
  if (message.includes('restricted_page')) return '⚠️ This page is restricted by the browser';
  if (message.includes('Cannot access') || message.includes('permission')) return '⚠️ This page does not allow text access';
  if (message.includes('No readable text found')) return '⚠️ No readable text found on this page';
  return message || 'Failed to read current page';
}

function extractPageText() {
  const root = document.body || document.documentElement;
  if (!root) return '';

  const directText = (document.body?.innerText || document.documentElement?.innerText || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (directText.length >= 40) return directText;

  const blockedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME']);

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || blockedTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        const text = node.textContent?.replace(/\s+/g, ' ').trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || parent.closest('[hidden], [aria-hidden="true"]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const parts = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    parts.push(currentNode.textContent.replace(/\s+/g, ' ').trim());
  }
  return parts.join(' ');
}

function buildPageTextPreview(text) {
  if (text.length <= PAGE_TEXT_PREVIEW_LIMIT) return text;
  return `${text.slice(0, PAGE_TEXT_PREVIEW_LIMIT)}...`;
}

function getNegativeKeywords() {
  const input = negativeKeywordsInput?.value || '';
  return new Set(input.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0));
}

function extractNgrams(words, n, negativeSet, minFreq = 2) {
  const ngrams = new Map();
  for (let i = 0; i <= words.length - n; i++) {
    const phrase = words.slice(i, i + n).join(' ');
    if (phrase.length < n * 2) continue;
    
    const wordsInPhrase = phrase.split(' ');
    let hasNegative = false;
    for (const w of wordsInPhrase) {
      if (negativeSet.has(w)) {
        hasNegative = true;
        break;
      }
    }
    if (hasNegative) continue;
    
    ngrams.set(phrase, (ngrams.get(phrase) || 0) + 1);
  }
  
  return Array.from(ngrams.entries())
    .filter(([, count]) => count >= minFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase, count]) => ({ phrase, count }));
}

function analyzeSentiment(text) {
  const words = text.toLowerCase().match(/[\p{L}\p{M}]+(?:[-'’–][\p{L}\p{M}]+)*/gu) || [];
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of words) {
    if (positiveWords.has(word)) positiveCount++;
    if (negativeWords.has(word)) negativeCount++;
  }
  
  const total = positiveCount + negativeCount;
  const score = total === 0 ? 0 : (positiveCount - negativeCount) / total;
  const sentiment = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
  
  return {
    score: (score * 100).toFixed(1),
    sentiment,
    positiveCount,
    negativeCount,
    ratio: total === 0 ? 0 : ((positiveCount / total) * 100).toFixed(1)
  };
}

function renderSentiment() {
  if (!currentSentiment) return;
  
  const sentimentResults = document.getElementById('sentimentResults');
  const sentimentClass = currentSentiment.sentiment;
  
  if (!sentimentResults) return;
  
  sentimentResults.innerHTML = `
    <div class="sentiment-container">
      <div class="sentiment-emoji">
        ${currentSentiment.sentiment === 'positive' ? '😊' : currentSentiment.sentiment === 'negative' ? '😞' : '😐'}
      </div>
      <div class="sentiment-title sentiment-${sentimentClass}">
        ${currentSentiment.sentiment.toUpperCase()} (${currentSentiment.score}%)
      </div>
      <div class="sentiment-stats">
        <div class="sentiment-stat-card">
          <div class="sentiment-stat-label">Positive Words</div>
          <div class="sentiment-stat-value sentiment-stat-value-positive">${currentSentiment.positiveCount}</div>
        </div>
        <div class="sentiment-stat-card">
          <div class="sentiment-stat-label">Negative Words</div>
          <div class="sentiment-stat-value sentiment-stat-value-negative">${currentSentiment.negativeCount}</div>
        </div>
      </div>
      <div class="sentiment-ratio-container">
        <div class="sentiment-ratio-label">Positive/Negative Ratio</div>
        <div class="sentiment-ratio-value">${currentSentiment.ratio}% positive</div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${currentSentiment.ratio}%;"></div>
        </div>
      </div>
    </div>
  `;
}

function renderNgrams() {
  if (!ngramsResults) return;
  if (!currentNgrams.length) {
    ngramsResults.innerHTML = '<div class="empty">No phrases found. Try a different n-gram size.</div>';
    return;
  }
  
  ngramsResults.innerHTML = currentNgrams.map((item, idx) => `
    <div class="result-item">
      <span class="keyword">
        <span class="keyword-rank">#${idx+1}</span>
        <span>“${item.phrase}”</span>
      </span>
      <span class="count">${item.count}x</span>
    </div>
  `).join('');
}

async function extractKeywordsHandler() {
  setLoading(true, '🔍 Analyzing keywords...');

  try {
    const manualText = textInput.value.trim();
    const usingLoadedPageText = textInput.dataset.source === 'page' && Boolean(cachedPageText);
    let text = usingLoadedPageText ? cachedPageText : manualText;
    let source = usingLoadedPageText ? '🌐 Current page' : '📝 Typed text';

    if (!text) {
      if (!cachedPageText) await readCurrentPageText();
      if (cachedPageText) {
        text = cachedPageText;
        source = '🌐 Current page';
      } else {
        throw new Error('Please provide text or read from a webpage first.');
      }
    }

    if (!text || text.length < 20) {
      throw new Error('Text is too short. Provide at least 20 characters.');
    }

    const topN = Number(topCount.value) || 15;
    const negativeSet = getNegativeKeywords();
    const minLen = Number(minWordLength.value) || 3;
    const minFreq = Number(minFrequency.value) || 2;
    
    const result = extractSmartKeywords(text, topN, negativeSet, minLen, minFreq);
    currentKeywords = result.keywords;
    currentTotalWords = result.totalWords;
    currentUniqueWords = result.uniqueWords;
    currentAvgDensity = result.avgDensity;
    
    const ngramN = Number(ngramSize.value) || 2;
    const words = text.toLowerCase().match(/[\p{L}\p{M}]+(?:[-'’–][\p{L}\p{M}]+)*/gu) || [];
    currentNgrams = extractNgrams(words, ngramN, negativeSet, minFreq);
    
    currentSentiment = analyzeSentiment(text);
    
    updateStatsBar();
    applyFilter();
    renderNgrams();
    renderSentiment();
    renderSeoAnalysis();
    
    sourceTag.textContent = source;
    statusText.innerHTML = `<span class="status-icon status-success"></span> Found ${currentKeywords.length} keywords from ${currentTotalWords} words.`;
    
    if (currentKeywords.length > 0) {
      insightCard.style.display = 'block';
      statsBar.style.display = 'block';
      updateInsight(currentKeywords);
      drawWordCloud();
    } else {
      insightCard.style.display = 'none';
      statsBar.style.display = 'none';
    }
    setLoading(false);
  } catch (error) {
    resultsEl.innerHTML = `<div class="empty">⚠️ ${error.message || 'Extraction failed'}</div>`;
    statusText.innerHTML = `<span class="status-icon status-error"></span> ${error.message || 'Failed to extract'}`;
    sourceTag.textContent = 'No data';
    currentKeywords = [];
    insightCard.style.display = 'none';
    statsBar.style.display = 'none';
    setLoading(false);
  }
}

function extractSmartKeywords(text, limit, negativeSet = new Set(), minWordLength = 3, minFrequency = 2) {
  const words = String(text)
    .toLowerCase()
    .normalize('NFKD')
    .match(/[\p{L}\p{M}]+(?:[-'’–][\p{L}\p{M}]+)*/gu) || [];

  const totalWords = words.length;
  const frequency = new Map();
  const uniqueWordsSet = new Set();
  
  for (const rawWord of words) {
    let word = rawWord.toLowerCase();
    word = word.replace(/^['’]+|['’]+$/g, '');
    if (!word || word.length < minWordLength) continue;
    if (stopWords.has(word)) continue;
    if (negativeSet.has(word)) continue;
    if (/^\d+$/.test(word)) continue;
    
    uniqueWordsSet.add(word);
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }
  
  const sorted = Array.from(frequency.entries())
    .filter(([, count]) => count >= minFrequency)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ 
      word, 
      count,
      density: ((count / totalWords) * 100).toFixed(2)
    }));
  
  const avgDensity = sorted.length ? (sorted.reduce((sum, k) => sum + parseFloat(k.density), 0) / sorted.length).toFixed(2) : 0;
  
  return { 
    keywords: sorted, 
    totalWords,
    uniqueWords: uniqueWordsSet.size,
    avgDensity: parseFloat(avgDensity)
  };
}

function updateStatsBar() {
  if (totalWordsSpan) totalWordsSpan.textContent = currentTotalWords;
  if (uniqueKeywordsSpan) uniqueKeywordsSpan.textContent = currentUniqueWords;
  if (avgDensitySpan) avgDensitySpan.textContent = `${currentAvgDensity}%`;
}

function renderResults(items) {
  resultsEl.innerHTML = '';
  
  if (!items.length) {
    resultsEl.innerHTML = '<div class="empty">🔍 No keywords found. Try different text or adjust filters.</div>';
    return;
  }
  
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'result-item';
    
    const keywordSpan = document.createElement('span');
    keywordSpan.className = 'keyword';
    
    const rankSpan = document.createElement('span');
    rankSpan.className = 'keyword-rank';
    rankSpan.textContent = `#${idx+1}`;
    
    const wordSpan = document.createElement('span');
    wordSpan.className = 'keyword-word';
    wordSpan.textContent = item.word;
    
    keywordSpan.appendChild(rankSpan);
    keywordSpan.appendChild(wordSpan);
    
    const rightSection = document.createElement('div');
    rightSection.className = 'result-item-right';
    
    const densitySpan = document.createElement('span');
    densitySpan.className = 'density-text';
    densitySpan.textContent = `${item.density}%`;
    
    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = `${item.count}x`;
    
    rightSection.appendChild(densitySpan);
    rightSection.appendChild(countSpan);
    
    row.appendChild(keywordSpan);
    row.appendChild(rightSection);
    resultsEl.appendChild(row);
  });
}

function drawWordCloud() {
  if (!wordCloudCanvas || !currentKeywords.length) return;
  
  const canvas = wordCloudCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = 400;
  const height = canvas.height = 300;
  
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f9fbfe';
  ctx.fillRect(0, 0, width, height);
  
  const maxCount = Math.max(...currentKeywords.map(k => k.count));
  const minSize = 12;
  const maxSize = 34;
  
  const words = currentKeywords.slice(0, 25);
  
  words.forEach((item, idx) => {
    const size = minSize + (item.count / maxCount) * (maxSize - minSize);
    const angle = (Math.sin(idx) * Math.PI) / 4;
    
    let x = width/2 + Math.sin(idx * 0.8) * 80;
    let y = height/2 + Math.cos(idx * 0.6) * 70;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `${Math.floor(size)}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = `hsl(${200 + (idx * 12) % 160}, 70%, 50%)`;
    ctx.shadowBlur = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.fillText(item.word, -ctx.measureText(item.word).width/2, 0);
    ctx.restore();
  });
  
  const cloudInfo = document.getElementById('cloudInfo');
  if (cloudInfo) cloudInfo.textContent = `${words.length} keywords visualized`;
}

function downloadWordCloud() {
  if (!wordCloudCanvas) return;
  const link = document.createElement('a');
  link.download = 'wordcloud.png';
  link.href = wordCloudCanvas.toDataURL();
  link.click();
}

function updateInsight(keywords) {
  if (!keywords.length) {
    insightCard.style.display = 'none';
    return;
  }
  const top3 = keywords.slice(0, 3);
  const topWords = top3.map(k => k.word).join(', ');
  const avgDensity = (keywords.reduce((sum, k) => sum + parseFloat(k.density), 0) / keywords.length).toFixed(2);
  
  let advice = '';
  if (keywords.length >= 15) {
    advice = '🔥 Excellent keyword diversity! Your content covers many topics.';
  } else if (keywords.length >= 8) {
    advice = '📈 Good variety. Focus on top keywords for SEO headings.';
  } else {
    advice = '💡 Try expanding content length or adding related terms.';
  }
  
  insightText.innerHTML = `🎯 Top themes: <strong>${topWords}</strong><br>📊 Avg keyword density: ${avgDensity}%<br>${advice}`;
}

async function copyResultsToClipboard() {
  if (!currentKeywords.length) {
    statusText.innerHTML = `<span class="status-icon status-warning"></span> No keywords to copy.`;
    return;
  }
  
  const text = currentKeywords.map((kw, i) => `${i+1}. ${kw.word} (${kw.count} times, ${kw.density}%)`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    statusText.innerHTML = `<span class="status-icon status-success"></span> ✅ Copied!`;
    setTimeout(() => updateStatusMessage(), 1500);
  } catch (err) {
    statusText.innerHTML = `<span class="status-icon status-error"></span> Copy failed`;
  }
}

async function copyAllToClipboard() {
  if (!currentKeywords.length) {
    statusText.innerHTML = `<span class="status-icon status-warning"></span> No keywords to copy.`;
    return;
  }
  
  let text = `=== KEYWORD ANALYSIS REPORT ===\n`;
  text += `Date: ${new Date().toLocaleString()}\n`;
  text += `Total Words: ${currentTotalWords}\n`;
  text += `Unique Keywords: ${currentUniqueWords}\n`;
  text += `Average Density: ${currentAvgDensity}%\n`;
  text += `\n--- TOP KEYWORDS ---\n`;
  text += currentKeywords.map((kw, i) => `${i+1}. ${kw.word} - ${kw.count}x (${kw.density}%)`).join('\n');
  
  if (currentNgrams.length) {
    text += `\n\n--- TOP PHRASES (${ngramSize.value}-grams) ---\n`;
    text += currentNgrams.map((item, i) => `${i+1}. "${item.phrase}" - ${item.count}x`).join('\n');
  }
  
  if (currentSentiment) {
    text += `\n\n--- SENTIMENT ANALYSIS ---\n`;
    text += `Overall Sentiment: ${currentSentiment.sentiment.toUpperCase()} (${currentSentiment.score}%)\n`;
    text += `Positive Words: ${currentSentiment.positiveCount}\n`;
    text += `Negative Words: ${currentSentiment.negativeCount}\n`;
    text += `Positivity Ratio: ${currentSentiment.ratio}%\n`;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    statusText.innerHTML = `<span class="status-icon status-success"></span> ✅ Full report copied!`;
    setTimeout(() => updateStatusMessage(), 2000);
  } catch (err) {
    statusText.innerHTML = `<span class="status-icon status-error"></span> Copy failed`;
  }
}

function exportData() {
  if (!currentKeywords.length) {
    statusText.innerHTML = `<span class="status-icon status-warning"></span> No data to export`;
    return;
  }
  
  const format = exportFormat.value;
  let content, filename, type;
  
  if (format === 'csv') {
    content = ['Rank,Keyword,Count,Density(%)', ...currentKeywords.map((k, i) => `${i+1},"${k.word}",${k.count},${k.density}`)].join('\n');
    filename = `keywords_${Date.now()}.csv`;
    type = 'text/csv';
  } else if (format === 'json') {
    content = JSON.stringify({ 
      timestamp: new Date().toISOString(), 
      keywords: currentKeywords,
      ngrams: currentNgrams,
      sentiment: currentSentiment,
      totalWords: currentTotalWords,
      uniqueWords: currentUniqueWords,
      avgDensity: currentAvgDensity
    }, null, 2);
    filename = `keywords_${Date.now()}.json`;
    type = 'application/json';
  } else if (format === 'markdown') {
    content = `# Keyword Analysis Report\n\n`;
    content += `**Date:** ${new Date().toLocaleString()}\n`;
    content += `**Total Words:** ${currentTotalWords}\n`;
    content += `**Unique Keywords:** ${currentUniqueWords}\n`;
    content += `**Average Density:** ${currentAvgDensity}%\n\n`;
    content += `## Top Keywords\n\n`;
    content += `| Rank | Keyword | Count | Density |\n`;
    content += `|------|---------|-------|---------|\n`;
    content += currentKeywords.map((k, i) => `| ${i+1} | ${k.word} | ${k.count} | ${k.density}% |`).join('\n');
    filename = `keywords_${Date.now()}.md`;
    type = 'text/markdown';
  } else {
    content = currentKeywords.map((k, i) => `${i+1}. ${k.word} - ${k.count} times (${k.density}%)`).join('\n');
    filename = `keywords_${Date.now()}.txt`;
    type = 'text/plain';
  }
  
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  statusText.innerHTML = `<span class="status-icon status-success"></span> Exported as ${format.toUpperCase()}`;
  setTimeout(() => updateStatusMessage(), 1500);
}

function updateStatusMessage() {
  if (currentKeywords.length) {
    statusText.innerHTML = `<span class="status-icon status-success"></span> Ready | ${currentKeywords.length} keywords`;
  } else {
    statusText.innerHTML = `<span class="status-icon"></span> Ready — paste text or read webpage`;
  }
}

function setLoading(isLoading, message = '') {
  readPageBtn.disabled = isLoading;
  extractBtn.disabled = isLoading;
  if (message) {
    statusText.innerHTML = `<span class="status-icon status-warning"></span> ${message}`;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

// SEO Analysis Functions
function analyzeSEO(text, keywords, ngrams) {
  const analysis = {
    score: 0,
    metrics: {},
    recommendations: [],
    checklist: [],
    keywordDensity: []
  };
  
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;
  const avgWordLength = (charCount / wordCount).toFixed(1);
  const paragraphs = text.split(/\n\s*\n/).length;
  const sentences = text.split(/[.!?]+/).length - 1;
  const avgSentenceLength = (wordCount / Math.max(sentences, 1)).toFixed(1);
  
  analysis.metrics = {
    wordCount,
    charCount,
    avgWordLength,
    paragraphs,
    sentences,
    avgSentenceLength,
    keywordCount: keywords.length,
    uniqueKeywordRatio: ((keywords.length / (new Set(text.toLowerCase().match(/\b\w+\b/g) || []).size)) * 100).toFixed(1)
  };
  
  let score = 0;
  
  if (wordCount >= 1000) score += 20;
  else if (wordCount >= 600) score += 15;
  else if (wordCount >= 300) score += 10;
  else if (wordCount >= 150) score += 5;
  
  const topKeyword = keywords[0]?.word || '';
  const topKeywordCount = keywords[0]?.count || 0;
  const topKeywordDensity = (topKeywordCount / wordCount * 100).toFixed(1);
  
  if (topKeywordDensity >= 1 && topKeywordDensity <= 3) score += 25;
  else if (topKeywordDensity > 0.5 && topKeywordDensity < 5) score += 15;
  else if (topKeywordDensity > 0) score += 8;
  
  if (paragraphs >= 5) score += 10;
  else if (paragraphs >= 3) score += 5;
  
  if (avgSentenceLength >= 15 && avgSentenceLength <= 25) score += 10;
  else if (avgSentenceLength > 10 && avgSentenceLength < 35) score += 5;
  
  if (keywords.length >= 20) score += 20;
  else if (keywords.length >= 10) score += 15;
  else if (keywords.length >= 5) score += 10;
  else if (keywords.length >= 3) score += 5;
  
  if (avgWordLength <= 5) score += 15;
  else if (avgWordLength <= 6) score += 10;
  else if (avgWordLength <= 7) score += 5;
  
  analysis.score = Math.min(100, Math.max(0, score));
  
  analysis.recommendations = generateRecommendations(analysis.metrics, keywords, topKeywordDensity, wordCount);
  analysis.checklist = generateChecklist(analysis.metrics, topKeywordDensity, wordCount);
  analysis.keywordDensity = keywords.slice(0, 10).map(kw => ({
    word: kw.word,
    density: ((kw.count / wordCount) * 100).toFixed(2),
    count: kw.count
  }));
  
  return analysis;
}

function generateRecommendations(metrics, keywords, topKeywordDensity, wordCount) {
  const recommendations = [];
  
  if (metrics.wordCount < 300) {
    recommendations.push({
      priority: 'high',
      title: '⚠️ Low word count',
      description: `Your content has only ${metrics.wordCount} words. Aim for 600-1500 words for better SEO ranking.`,
      suggestion: 'Expand your content with more detailed information, examples, or case studies.',
      suggestedWords: ['detailed guide', 'comprehensive overview', 'in-depth analysis', 'step-by-step tutorial']
    });
  } else if (metrics.wordCount < 600) {
    recommendations.push({
      priority: 'medium',
      title: '📄 Moderate content length',
      description: `${metrics.wordCount} words is decent, but 600-1000+ words typically rank better.`,
      suggestion: 'Add a FAQ section or expand existing sections with more examples.',
      suggestedWords: ['additional tips', 'frequently asked questions', 'expert insights', 'real-world examples']
    });
  } else if (metrics.wordCount > 2000) {
    recommendations.push({
      priority: 'low',
      title: '📚 Very detailed content',
      description: `Great length! Consider breaking into multiple articles or adding subheadings.`,
      suggestion: 'Add more subheadings and internal links to improve scannability.',
      suggestedWords: ['table of contents', 'summary section', 'key takeaways']
    });
  }
  
  if (topKeywordDensity < 0.5) {
    recommendations.push({
      priority: 'medium',
      title: '🔑 Low keyword density',
      description: `Your main keyword appears only ${topKeywordDensity}% of the time. Aim for 1-3% density.`,
      suggestion: 'Naturally incorporate your target keyword in headings, first paragraph, and conclusion.',
      suggestedWords: [keywords[0]?.word, `${keywords[0]?.word} guide`, `best ${keywords[0]?.word}`].filter(Boolean)
    });
  } else if (topKeywordDensity > 5) {
    recommendations.push({
      priority: 'high',
      title: '⚠️ Keyword stuffing detected',
      description: `${topKeywordDensity}% density is too high and may hurt rankings.`,
      suggestion: 'Reduce keyword frequency and use synonyms instead.',
      suggestedWords: keywords.slice(1, 4).map(k => k.word)
    });
  }
  
  if (metrics.keywordCount < 5) {
    recommendations.push({
      priority: 'high',
      title: '🎯 Limited keyword variety',
      description: `Only ${metrics.keywordCount} unique keywords found.`,
      suggestion: 'Use more related terms and synonyms throughout your content.',
      suggestedWords: ['benefits', 'advantages', 'features', 'solutions', 'tips', 'strategies']
    });
  } else if (metrics.keywordCount < 10) {
    recommendations.push({
      priority: 'medium',
      title: '📊 Improve keyword diversity',
      description: `${metrics.keywordCount} keywords is okay, but 15+ is better for comprehensive coverage.`,
      suggestion: 'Add related subtopics and long-tail keywords.',
      suggestedWords: ['essential tips', 'common mistakes', 'best practices', 'proven strategies']
    });
  }
  
  if (metrics.avgSentenceLength > 25) {
    recommendations.push({
      priority: 'medium',
      title: '✂️ Long sentences detected',
      description: `Average sentence length is ${metrics.avgSentenceLength} words.`,
      suggestion: 'Break long sentences into shorter, more readable ones (15-20 words ideal).',
      suggestedWords: ['Therefore,', 'However,', 'For example,', 'In addition,']
    });
  }
  
  if (metrics.paragraphs < 3 && wordCount > 200) {
    recommendations.push({
      priority: 'high',
      title: '📑 Poor content structure',
      description: `Only ${metrics.paragraphs} paragraphs for ${wordCount} words.`,
      suggestion: 'Break content into smaller paragraphs (3-5 sentences each) with descriptive headings.',
      suggestedWords: ['Introduction', 'Main Points', 'Key Benefits', 'Conclusion']
    });
  }
  
  if (currentNgrams && currentNgrams.length > 0) {
    recommendations.push({
      priority: 'low',
      title: '💡 Use high-performing phrases',
      description: 'These phrases appear frequently in your content.',
      suggestion: 'Use these phrases in headings, meta descriptions, and subheadings.',
      suggestedWords: currentNgrams.slice(0, 5).map(n => n.phrase)
    });
  }
  
  return recommendations;
}

function generateChecklist(metrics, keywordDensity, wordCount) {
  return [
    { check: wordCount >= 300, text: 'Content length is sufficient (300+ words)' },
    { check: wordCount >= 600, text: 'Content is comprehensive (600+ words recommended)' },
    { check: metrics.paragraphs >= 3, text: 'Content has proper paragraph structure' },
    { check: metrics.keywordCount >= 10, text: 'Good keyword variety' },
    { check: keywordDensity >= 0.5 && keywordDensity <= 3, text: 'Keyword density is optimal (0.5-3%)' },
    { check: metrics.avgSentenceLength >= 10 && metrics.avgSentenceLength <= 25, text: 'Sentence length is reader-friendly' },
    { check: currentNgrams && currentNgrams.length > 0, text: 'Has relevant phrases for headings' },
    { check: currentKeywords.length > 0, text: 'Has target keywords identified' }
  ];
}

function renderSeoAnalysis() {
  if (!currentKeywords.length || !seoResults) {
    if (seoResults) {
      seoResults.innerHTML = '<div class="empty">⚠️ Extract keywords first to get SEO analysis</div>';
    }
    return;
  }
  
  const text = cachedPageText || textInput.value;
  if (!text) {
    seoResults.innerHTML = '<div class="empty">⚠️ No content available for SEO analysis</div>';
    return;
  }
  
  const analysis = analyzeSEO(text, currentKeywords, currentNgrams);
  currentSeoScore = analysis;
  currentRecommendations = analysis.recommendations;
  
  const scoreColor = analysis.score >= 70 ? '#10b981' : analysis.score >= 40 ? '#f59e0b' : '#ef4444';
  const scoreStatus = analysis.score >= 70 ? 'Good' : analysis.score >= 40 ? 'Needs Improvement' : 'Poor';
  
  seoResults.innerHTML = `
    <div class="seo-score-container">
      <div class="seo-score-circle">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" stroke-width="8"/>
          <circle cx="60" cy="60" r="54" fill="none" stroke="${scoreColor}" stroke-width="8" 
                  stroke-dasharray="${2 * Math.PI * 54}" stroke-dashoffset="${2 * Math.PI * 54 * (1 - analysis.score / 100)}"
                  transform="rotate(-90 60 60)" style="transition: stroke-dashoffset 0.8s ease"/>
        </svg>
        <div class="seo-score-number">${analysis.score}</div>
      </div>
      <div class="seo-score-label">SEO Score • ${scoreStatus}</div>
    </div>
    
    <div class="seo-metrics-grid">
      <div class="seo-metric-card">
        <div class="seo-metric-value">${analysis.metrics.wordCount}</div>
        <div class="seo-metric-label">Words</div>
      </div>
      <div class="seo-metric-card">
        <div class="seo-metric-value">${analysis.metrics.paragraphs}</div>
        <div class="seo-metric-label">Paragraphs</div>
      </div>
      <div class="seo-metric-card">
        <div class="seo-metric-value">${analysis.metrics.keywordCount}</div>
        <div class="seo-metric-label">Keywords</div>
      </div>
      <div class="seo-metric-card">
        <div class="seo-metric-value">${analysis.metrics.avgSentenceLength}</div>
        <div class="seo-metric-label">Avg Sentence</div>
      </div>
    </div>
    
    <div class="seo-section">
      <div class="seo-section-title">
        <span>📋</span> SEO Checklist
      </div>
      <ul class="seo-checklist">
        ${analysis.checklist.map(item => `
          <li>
            <span class="${item.check ? 'check-pass' : 'check-fail'}">${item.check ? '✓' : '✗'}</span>
            <span>${item.text}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    
    <div class="seo-section">
      <div class="seo-section-title">
        <span>🎯</span> Keyword Density Analysis
      </div>
      <div class="seo-keyword-density">
        ${analysis.keywordDensity.map(kw => `
          <div class="density-bar-container">
            <div class="density-bar-label">
              <span><strong>${kw.word}</strong></span>
              <span>${kw.density}% (${kw.count}x)</span>
            </div>
            <div class="density-bar-bg">
              <div class="density-bar-fill" style="width: ${Math.min(100, kw.density * 10)}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="seo-section">
      <div class="seo-section-title">
        <span>💡</span> Recommendations to Improve SEO
      </div>
      ${analysis.recommendations.map(rec => `
        <div class="seo-recommendation ${rec.priority}">
          <div class="recommendation-title">
            ${rec.title}
            <span class="priority-badge ${rec.priority}">${rec.priority.toUpperCase()} PRIORITY</span>
          </div>
          <div class="recommendation-description">${rec.description}</div>
          ${rec.suggestedWords ? `
            <div class="recommendation-words">
              ${rec.suggestedWords.map(word => `
                <span class="word-suggestion" data-word="${word.replace(/['"`]/g, '&quot;')}">${word}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
  
  document.querySelectorAll('.word-suggestion').forEach(el => {
    el.addEventListener('click', () => {
      const word = el.dataset.word;
      if (word) {
        const currentText = textInput.value;
        textInput.value = currentText + (currentText ? ' ' : '') + word;
        statusText.innerHTML = `<span class="status-icon status-success"></span> Added "${word}" to content`;
        setTimeout(() => updateStatusMessage(), 1500);
      }
    });
  });
}

function exportSeoReport() {
  if (!currentSeoScore) {
    statusText.innerHTML = `<span class="status-icon status-warning"></span> Run SEO analysis first`;
    return;
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    seoScore: currentSeoScore.score,
    metrics: currentSeoScore.metrics,
    checklist: currentSeoScore.checklist,
    recommendations: currentRecommendations.map(r => ({
      priority: r.priority,
      title: r.title,
      description: r.description,
      suggestedWords: r.suggestedWords || []
    })),
    keywordDensity: currentSeoScore.keywordDensity
  };
  
  const content = `# SEO Analysis Report
Date: ${new Date().toLocaleString()}

## OVERALL SEO SCORE: ${report.seoScore}/100

## CONTENT METRICS
- Word Count: ${report.metrics.wordCount}
- Character Count: ${report.metrics.charCount}
- Paragraphs: ${report.metrics.paragraphs}
- Sentences: ${report.metrics.sentences}
- Average Sentence Length: ${report.metrics.avgSentenceLength} words
- Unique Keywords: ${report.metrics.keywordCount}
- Keyword Variety Ratio: ${report.metrics.uniqueKeywordRatio}%

## SEO CHECKLIST
${report.checklist.map(item => `- ${item.check ? '✓' : '✗'} ${item.text}`).join('\n')}

## KEYWORD DENSITY
${report.keywordDensity.map(kw => `- ${kw.word}: ${kw.density}% (${kw.count} times)`).join('\n')}

## RECOMMENDATIONS
${report.recommendations.map(rec => `
### ${rec.title} (${rec.priority.toUpperCase()})
${rec.description}
${rec.suggestedWords.length ? `Suggested words/phrases: ${rec.suggestedWords.join(', ')}` : ''}
`).join('\n')}

---
Generated by Keyword Extractor Pro
`;
  
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seo_report_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  
  statusText.innerHTML = `<span class="status-icon status-success"></span> SEO report exported`;
  setTimeout(() => updateStatusMessage(), 1500);
}

loadHistory();
renderResults([]);
updateStatusMessage();