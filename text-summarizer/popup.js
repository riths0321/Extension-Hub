document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const summarizeBtn = document.getElementById("summarize");
  const copyBtn = document.getElementById("copy");
  const clearBtn = document.getElementById("clear");
  const ratioInput = document.getElementById("summaryRatio");
  const ratioLabel = document.getElementById("ratioLabel");
  const statusText = document.getElementById("statusText");
  const inputCount = document.getElementById("inputCount");
  const outputCount = document.getElementById("outputCount");
  const compressionValue = document.getElementById("compressionValue");
  const sentenceCount = document.getElementById("sentenceCount");

  let latestSummary = "";

  input.addEventListener("input", updateInputStats);
  ratioInput.addEventListener("input", () => {
    ratioLabel.textContent = `${ratioInput.value}%`;
    compressionValue.textContent = `${ratioInput.value}%`;
  });

  summarizeBtn.addEventListener("click", () => {
    const sourceText = input.value.trim();
    if (!sourceText) {
      latestSummary = "";
      output.textContent = "Paste some text to generate a summary.";
      outputCount.textContent = "0 words";
      statusText.textContent = "Waiting for input";
      return;
    }

    const summary = summarizeText(sourceText, Number(ratioInput.value));
    latestSummary = summary;
    output.textContent = summary;
    outputCount.textContent = `${countWords(summary)} words`;
    statusText.textContent = "Summary ready";
  });

  copyBtn.addEventListener("click", async () => {
    if (!latestSummary) {
      statusText.textContent = "Nothing to copy";
      return;
    }

    try {
      await navigator.clipboard.writeText(latestSummary);
      statusText.textContent = "Summary copied";
    } catch (_error) {
      statusText.textContent = "Copy failed";
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    latestSummary = "";
    output.textContent = "Your summary will appear here.";
    outputCount.textContent = "0 words";
    statusText.textContent = "Ready";
    updateInputStats();
  });

  ratioLabel.textContent = `${ratioInput.value}%`;
  compressionValue.textContent = `${ratioInput.value}%`;
  updateInputStats();

  function updateInputStats() {
    const text = input.value.trim();
    inputCount.textContent = `${countWords(text)} words`;
    sentenceCount.textContent = `${splitSentences(text).length} sentences`;
  }

  function summarizeText(text, ratio) {
    const sentences = splitSentences(text);
    if (!sentences.length) {
      return text;
    }

    if (sentences.length === 1) {
      return sentences[0];
    }

    const stopWords = new Set([
      "the", "and", "for", "with", "that", "this", "from", "have", "your", "into",
      "about", "there", "their", "would", "could", "should", "will", "shall", "been",
      "were", "they", "them", "then", "than", "when", "what", "where", "which", "while",
      "also", "such", "here", "over", "under", "after", "before", "because", "very"
    ]);

    const words = text
      .toLowerCase()
      .match(/\b[a-z]{3,}\b/g) || [];

    const frequency = {};
    words.forEach((word) => {
      if (!stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    const ranked = sentences.map((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      const score = sentenceWords.reduce((sum, word) => sum + (frequency[word] || 0), 0);
      return { sentence, index, score };
    });

    const keepCount = Math.max(1, Math.ceil(ranked.length * (ratio / 100)));
    const selected = ranked
      .sort((a, b) => b.score - a.score)
      .slice(0, keepCount)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.sentence.trim());

    return selected.join(" ");
  }

  function splitSentences(text) {
    const cleaned = text.trim();
    if (!cleaned) {
      return [];
    }

    const matched = cleaned.match(/[^.!?\n]+[.!?]?/g) || [];
    return matched.map((sentence) => sentence.trim()).filter(Boolean);
  }

  function countWords(text) {
    return text ? (text.match(/\b\S+\b/g) || []).length : 0;
  }
});
