/**
 * Secure Markdown Parser (Chrome Web Store Safe)
 * Prevents XSS via URL sanitization + HTML escaping
 */

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

// Validate URL safety
function sanitizeUrl(url) {
    if (!url) return '#';

    try {
        // Trim spaces
        url = url.trim();

        // Decode encoded attacks
        const decoded = decodeURIComponent(url).toLowerCase();

        // Block dangerous protocols
        if (
            decoded.startsWith('javascript:') ||
            decoded.startsWith('data:') ||
            decoded.startsWith('vbscript:') ||
            decoded.startsWith('file:') ||
            decoded.startsWith('blob:')
        ) {
            return '#';
        }

        const parsed = new URL(url, 'https://example.com');

        if (!SAFE_PROTOCOLS.includes(parsed.protocol)) {
            return '#';
        }

        return parsed.href;
    } catch {
        return '#';
    }
}

// Escape HTML safely
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const parseMarkdown = (markdown) => {
    if (!markdown) return '';

    let html = escapeHtml(markdown)

        // Headers
        .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
        .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')

        // Blockquotes
        .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')

        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/__(.*?)__/gim, '<strong>$1</strong>')

        // Italic
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/_(.*?)_/gim, '<em>$1</em>')

        // Inline Code
        .replace(/`([^`]+)`/gim, '<code>$1</code>')

        // Secure Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, url) => {
            const safeUrl = sanitizeUrl(url);
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
        })

        // Secure Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, (match, alt, url) => {
            const safeUrl = sanitizeUrl(url);
            if (safeUrl === '#') return ''; // remove unsafe images
            return `<img src="${safeUrl}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">`;
        })

        // Horizontal Rule
        .replace(/^---$/gim, '<hr>')

        // Unordered Lists
        .replace(/^\s*[\*\-\+] (.*)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>')
        .replace(/<\/ul>\s*<ul>/gim, '')

        // Ordered Lists
        .replace(/^\s*\d+\. (.*)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/gim, '<ol>$&</ol>')
        .replace(/<\/ol>\s*<ol>/gim, '')

        // Paragraphs
        .replace(/\n\n+/gim, '</p><p>')
        .replace(/^/gim, '<p>')
        .replace(/$/gim, '</p>')

        // Cleanup
        .replace(/<p><\/p>/gim, '')
        .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/gim, '$1')
        .replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/gim, '$1')
        .replace(/<p>(<ul>.*<\/ul>)<\/p>/gim, '$1')
        .replace(/<p>(<ol>.*<\/ol>)<\/p>/gim, '$1')
        .replace(/<p>(<hr>)<\/p>/gim, '$1');

    return html;
};

window.parseMarkdown = parseMarkdown;
