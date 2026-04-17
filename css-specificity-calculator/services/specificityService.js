/**
 * specificityService.js
 * Core CSS specificity calculation engine.
 * Original parsing logic preserved and enhanced.
 */

const LEGACY_PSEUDO_ELEMENTS = new Set([
  ':before', ':after', ':first-line', ':first-letter',
  ':selection', ':placeholder', ':marker', ':backdrop'
]);

/**
 * Parse a CSS selector string into typed parts.
 * @param {string} selector
 * @returns {Array<{type: string, value: string}>}
 */
function parseSelector(selector) {
  const parts = [];
  let buffer = '';
  let inAttribute = false;
  let inPseudo = false;
  let pseudoParenDepth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    const nextChar = selector[i + 1];

    if ((char === '"' || char === "'") && !inString) {
      inString = true; stringChar = char; buffer += char; continue;
    }
    if (inString && char === stringChar) {
      inString = false; buffer += char; continue;
    }
    if (inString) { buffer += char; continue; }

    if (char === '#' && !inAttribute && !inPseudo) {
      if (buffer) { parts.push({ type: 'element', value: buffer }); buffer = ''; }
      let idValue = '';
      let j = i + 1;
      while (j < selector.length && /[a-zA-Z0-9_-]/.test(selector[j])) { idValue += selector[j]; j++; }
      if (idValue) parts.push({ type: 'id', value: `#${idValue}` });
      i = j - 1; continue;
    }

    if (char === '.' && !inAttribute && !inPseudo) {
      if (buffer) { parts.push({ type: 'element', value: buffer }); buffer = ''; }
      let classValue = '';
      let j = i + 1;
      while (j < selector.length && /[a-zA-Z0-9_-]/.test(selector[j])) { classValue += selector[j]; j++; }
      if (classValue) parts.push({ type: 'class', value: `.${classValue}` });
      i = j - 1; continue;
    }

    if (char === '[') {
      inAttribute = true;
      if (buffer) { parts.push({ type: 'element', value: buffer }); buffer = ''; }
      buffer = char; continue;
    }

    if (char === ']' && inAttribute) {
      inAttribute = false; buffer += char;
      parts.push({ type: 'attribute', value: buffer }); buffer = ''; continue;
    }

    if (char === ':' && !inAttribute) {
      inPseudo = true;
      if (buffer) { parts.push({ type: 'element', value: buffer }); buffer = ''; }
      buffer = char; continue;
    }

    if (inPseudo) {
      if (char === '(') { pseudoParenDepth++; buffer += char; continue; }
      if (char === ')' && pseudoParenDepth > 0) { pseudoParenDepth--; buffer += char; continue; }
      if (char === ':' && buffer === ':') { buffer += ':'; i++; continue; }

      if (pseudoParenDepth === 0 && /[ ,>\+~\[\.#]/.test(char)) {
        inPseudo = false;
        const pval = buffer.trim();
        parts.push({ type: (pval.startsWith('::') || LEGACY_PSEUDO_ELEMENTS.has(pval.toLowerCase())) ? 'pseudo-element' : 'pseudo-class', value: pval });
        buffer = ''; i--; continue;
      }
      buffer += char; continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      buffer += char;
      let j = i + 1;
      while (j < selector.length && /[a-zA-Z0-9-]/.test(selector[j])) { buffer += selector[j]; j++; }
      i = j - 1; continue;
    }

    if (char === '*') { parts.push({ type: 'universal', value: '*' }); continue; }

    if (buffer && /[ ,>\+~]/.test(char)) {
      parts.push({ type: 'element', value: buffer }); buffer = ''; continue;
    }

    if (!/[ ,>\+~]/.test(char)) buffer += char;
  }

  if (buffer) {
    if (buffer.startsWith(':')) {
      parts.push({ type: (buffer.startsWith('::') || LEGACY_PSEUDO_ELEMENTS.has(buffer.toLowerCase())) ? 'pseudo-element' : 'pseudo-class', value: buffer });
    } else if (buffer === '*') {
      parts.push({ type: 'universal', value: buffer });
    } else if (buffer && !inAttribute) {
      parts.push({ type: 'element', value: buffer });
    }
  }

  return parts;
}

/**
 * Calculate numeric score from a,b,c,d tuple.
 */
function calculateScore([a, b, c, d]) {
  return (a * 1000000) + (b * 10000) + (c * 100) + d;
}

/**
 * Validate if selector is (likely) valid CSS.
 */
function validateSelector(selector) {
  if (!selector || !selector.trim()) return { valid: false, reason: 'Empty selector' };
  const dangerous = /[{}|\\^$@]/;
  if (dangerous.test(selector)) return { valid: false, reason: 'Invalid characters detected' };
  const openBrackets = (selector.match(/\[/g) || []).length;
  const closeBrackets = (selector.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) return { valid: false, reason: 'Unbalanced brackets' };
  const openParens = (selector.match(/\(/g) || []).length;
  const closeParens = (selector.match(/\)/g) || []).length;
  if (openParens !== closeParens) return { valid: false, reason: 'Unbalanced parentheses' };
  return { valid: true };
}

/**
 * Calculate full specificity result for a selector string.
 * @param {string} selector
 * @returns {object} specificity result
 */
function calculate(selector) {
  if (!selector || !selector.trim()) throw new Error('Empty selector');

  const validation = validateSelector(selector);
  if (!validation.valid) throw new Error(validation.reason);

  let a = 0, b = 0, c = 0, d = 0;
  const ids = [], classes = [], attributes = [], pseudoClasses = [], elements = [], pseudoElements = [];

  if (selector.includes('style=')) a = 1;

  const parts = parseSelector(selector);
  parts.forEach(part => {
    switch (part.type) {
      case 'id': b++; ids.push(part.value); break;
      case 'class': c++; classes.push(part.value); break;
      case 'attribute': c++; attributes.push(part.value); break;
      case 'pseudo-class': c++; pseudoClasses.push(part.value); break;
      case 'element': d++; elements.push(part.value); break;
      case 'pseudo-element': d++; pseudoElements.push(part.value); break;
      case 'universal': break;
    }
  });

  const specificity = [a, b, c, d];
  const score = calculateScore(specificity);

  // Smart hints
  const hints = [];
  if (b >= 2) hints.push({ type: 'warning', label: 'High Specificity', detail: 'Multiple IDs make overriding hard' });
  else if (b === 1) hints.push({ type: 'info', label: 'ID Selector', detail: 'IDs carry high specificity weight' });
  if (c >= 4) hints.push({ type: 'warning', label: 'Over-Specific', detail: 'Too many classes — hard to override' });
  if (b === 0 && c === 0 && d === 0 && a === 0) hints.push({ type: 'neutral', label: 'Zero Specificity', detail: 'Universal selector has no specificity' });

  return {
    selector,
    specificity,
    score,
    breakdown: { ids, classes, attributes, pseudoClasses, elements, pseudoElements },
    hints
  };
}

/**
 * Compare two specificity results.
 */
function compare(spec1, spec2) {
  const [a1, b1, c1, d1] = spec1.specificity;
  const [a2, b2, c2, d2] = spec2.specificity;

  if (a1 !== a2) return a1 > a2 ? winner(1, 'inline style', a1, a2) : winner(2, 'inline style', a2, a1);
  if (b1 !== b2) return b1 > b2 ? winner(1, 'ID count', b1, b2) : winner(2, 'ID count', b2, b1);
  if (c1 !== c2) return c1 > c2 ? winner(1, 'class/attribute/pseudo count', c1, c2) : winner(2, 'class/attribute/pseudo count', c2, c1);
  if (d1 !== d2) return d1 > d2 ? winner(1, 'element count', d1, d2) : winner(2, 'element count', d2, d1);

  return { winner: 0, label: 'Equal specificity', detail: 'Source order determines which wins', why: 'Both selectors have identical specificity. In a real stylesheet, the rule that appears last wins.' };
}

function winner(n, reason, higher, lower) {
  return {
    winner: n,
    label: `Selector ${n} wins`,
    detail: `Higher ${reason} (${higher} vs ${lower})`,
    why: buildWhyExplanation(n, reason, higher, lower)
  };
}

function buildWhyExplanation(winnerN, reason, higher, lower) {
  const loserN = winnerN === 1 ? 2 : 1;
  return `Selector ${winnerN} wins because it has a higher ${reason} (${higher} vs ${lower}). CSS specificity is compared left-to-right: inline → IDs → classes → elements. The first position where they differ determines the winner — Selector ${winnerN} has more weight there, so it overrides Selector ${loserN} regardless of source order.`;
}

export { calculate, compare, validateSelector };
