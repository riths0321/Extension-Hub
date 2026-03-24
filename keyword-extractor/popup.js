const stopWords = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'of', 'for', 'in', 'with', 'that', 'this', 'it', 'as', 'are',
  'was', 'were', 'by', 'be', 'or', 'from', 'if', 'then', 'than', 'but', 'about', 'into', 'over', 'under', 'not', 'can',
  'will', 'just', 'you', 'your', 'they', 'them', 'their', 'there', 'our', 'has', 'have', 'had', 'also', 'more', 'most',
  'such', 'these', 'those', 'its', 'who', 'what', 'when', 'where', 'why', 'how'
]);

const textInput = document.getElementById('textInput');
const readPageBtn = document.getElementById('readPageBtn');
const extractBtn = document.getElementById('extractBtn');
const topCount = document.getElementById('topCount');
const sourceTag = document.getElementById('sourceTag');
const statusText = document.getElementById('statusText');
const resultsEl = document.getElementById('results');

let cachedPageText = '';

readPageBtn.addEventListener('click', readCurrentPageText);
extractBtn.addEventListener('click', extractKeywordsHandler);

async function readCurrentPageText() {
  setLoading(true, 'Reading text from current page...');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body?.innerText || ''
    });

    const text = String(result?.[0]?.result || '').trim();
    if (!text) {
      throw new Error('No readable text found on this page');
    }

    cachedPageText = text;
    sourceTag.textContent = 'Current page';
    statusText.textContent = `Loaded ${formatNumber(text.length)} characters from the active tab.`;
    setLoading(false);
  } catch (error) {
    sourceTag.textContent = 'No data';
    statusText.textContent = getUserFriendlyScriptError(error);
    setLoading(false);
  }
}

async function extractKeywordsHandler() {
  setLoading(true, 'Extracting keywords...');

  try {
    const manualText = textInput.value.trim();
    let text = manualText;
    let source = 'Typed text';

    if (!text) {
      if (!cachedPageText) {
        await readCurrentPageText();
      }
      text = cachedPageText;
      source = 'Current page';
    }

    if (!text) {
      throw new Error('Please provide text or read from page first.');
    }

    const topN = Number(topCount.value) || 15;
    const keywords = extractKeywords(text, topN);
    renderResults(keywords);

    sourceTag.textContent = source;
    statusText.textContent = keywords.length
      ? `Found ${keywords.length} keywords from ${formatNumber(text.length)} characters.`
      : 'No significant keywords found.';
    setLoading(false);
  } catch (error) {
    resultsEl.textContent = '';
    statusText.textContent = error.message || 'Failed to extract keywords.';
    sourceTag.textContent = 'No data';
    setLoading(false);
  }
}

function extractKeywords(text, limit) {
  const words = String(text)
    .toLowerCase()
    // Supports multilingual words (Latin + non-Latin scripts).
    .match(/\p{L}[\p{L}\p{M}'’\-–]{2,}/gu) || [];

  const frequency = Object.create(null);

  for (const rawWord of words) {
    const word = normalizeWord(rawWord);
    if (!word || stopWords.has(word) || word.length < 3) {
      continue;
    }
    frequency[word] = (frequency[word] || 0) + 1;
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function normalizeWord(word) {
  return word
    .trim()
    .replace(/^['’\-–]+|['’\-–]+$/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{M}'’\-–]/gu, '');
}

function renderResults(items) {
  resultsEl.textContent = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No keywords found.';
    resultsEl.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'result-item';

    const keyword = document.createElement('span');
    keyword.className = 'keyword';
    keyword.textContent = item.word;
    keyword.title = item.word;

    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = String(item.count);

    row.append(keyword, count);
    resultsEl.appendChild(row);
  }
}

function setLoading(isLoading, message = '') {
  readPageBtn.disabled = isLoading;
  extractBtn.disabled = isLoading;
  if (message) {
    statusText.textContent = message;
  }
}

function getUserFriendlyScriptError(error) {
  const message = (error && error.message) ? error.message : 'Could not read this page.';
  if (message.includes('Cannot access') || message.includes('chrome://') || message.includes('Extensions gallery')) {
    return 'This Chrome page is restricted. Open a normal website tab and try again.';
  }
  return message;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

renderResults([]);
statusText.textContent = 'Ready';
