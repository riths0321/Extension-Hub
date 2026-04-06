/**
 * TaggingService — auto-generates tags from URL + title.
 * Pure functions, no side effects.
 */

// Domain → primary tag map
const DOMAIN_TAG_MAP = {
  // Dev / Tech
  'github.com': ['dev', 'code'],
  'stackoverflow.com': ['dev', 'qa'],
  'developer.mozilla.org': ['dev', 'docs'],
  'npmjs.com': ['dev', 'packages'],
  'codepen.io': ['dev', 'design'],
  'figma.com': ['design'],
  'dribbble.com': ['design'],
  'vercel.com': ['dev', 'hosting'],
  'netlify.com': ['dev', 'hosting'],
  'aws.amazon.com': ['dev', 'cloud'],

  // Social
  'twitter.com': ['social'],
  'x.com': ['social'],
  'instagram.com': ['social'],
  'facebook.com': ['social'],
  'linkedin.com': ['social', 'work'],
  'reddit.com': ['social', 'forum'],
  'discord.com': ['social', 'chat'],

  // Work / Productivity
  'notion.so': ['work', 'notes'],
  'docs.google.com': ['work', 'docs'],
  'sheets.google.com': ['work', 'sheets'],
  'slides.google.com': ['work', 'slides'],
  'calendar.google.com': ['work', 'calendar'],
  'gmail.com': ['work', 'email'],
  'mail.google.com': ['work', 'email'],
  'slack.com': ['work', 'chat'],
  'trello.com': ['work', 'tasks'],
  'asana.com': ['work', 'tasks'],
  'jira.atlassian.com': ['work', 'tasks'],
  'confluence.atlassian.com': ['work', 'docs'],
  'zoom.us': ['work', 'meetings'],
  'meet.google.com': ['work', 'meetings'],
  'airtable.com': ['work', 'data'],
  'monday.com': ['work', 'tasks'],

  // Learning
  'coursera.org': ['learning'],
  'udemy.com': ['learning'],
  'khanacademy.org': ['learning'],
  'edx.org': ['learning'],
  'medium.com': ['reading', 'blog'],
  'substack.com': ['reading', 'newsletter'],
  'dev.to': ['reading', 'dev'],

  // Entertainment
  'youtube.com': ['video', 'entertainment'],
  'netflix.com': ['video', 'entertainment'],
  'twitch.tv': ['video', 'entertainment'],
  'spotify.com': ['music', 'entertainment'],

  // Shopping
  'amazon.com': ['shopping'],
  'amazon.in': ['shopping'],
  'flipkart.com': ['shopping'],
  'myntra.com': ['shopping'],

  // Finance
  'zerodha.com': ['finance'],
  'groww.in': ['finance'],
  'coinbase.com': ['finance', 'crypto'],

  // News
  'news.ycombinator.com': ['news', 'tech'],
  'techcrunch.com': ['news', 'tech'],
  'bbc.com': ['news'],
  'theverge.com': ['news', 'tech'],
};

// Title keyword → tag map
const TITLE_KEYWORD_TAG_MAP = [
  [['github', 'repo', 'repository', 'pull request', 'commit'], 'dev'],
  [['design', 'figma', 'sketch', 'prototype', 'wireframe', 'ui', 'ux'], 'design'],
  [['dashboard', 'analytics', 'metrics', 'report', 'data'], 'analytics'],
  [['tutorial', 'how to', 'guide', 'learn', 'course', 'documentation', 'docs'], 'learning'],
  [['invoice', 'billing', 'payment', 'finance', 'bank', 'expense'], 'finance'],
  [['youtube', 'video', 'watch', 'stream'], 'video'],
  [['news', 'article', 'blog', 'post', 'read'], 'reading'],
  [['shop', 'buy', 'cart', 'order', 'product'], 'shopping'],
  [['gmail', 'email', 'inbox', 'mail'], 'email'],
  [['calendar', 'event', 'schedule', 'meeting'], 'calendar'],
  [['notes', 'notion', 'document', 'wiki'], 'notes'],
  [['slack', 'discord', 'chat', 'message', 'whatsapp'], 'chat'],
  [['task', 'todo', 'jira', 'trello', 'asana', 'ticket'], 'tasks'],
  [['ai', 'gpt', 'llm', 'claude', 'openai', 'machine learning'], 'ai'],
];

export const TaggingService = {

  /**
   * Auto-generate tags from a URL and title.
   * Returns deduplicated, lowercase array of up to 5 tags.
   * @param {string} url
   * @param {string} title
   * @returns {string[]}
   */
  generateTags(url, title) {
    const tags = new Set();

    // Domain-based tags
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const domainTags = DOMAIN_TAG_MAP[hostname];
      if (domainTags) domainTags.forEach((t) => tags.add(t));

      // Check subdomain patterns
      if (hostname.includes('mail')) tags.add('email');
      if (hostname.includes('docs')) tags.add('docs');
      if (hostname.includes('calendar')) tags.add('calendar');
      if (hostname.includes('shop') || hostname.includes('store')) tags.add('shopping');
      if (hostname.includes('learn') || hostname.includes('course')) tags.add('learning');
    } catch (_) {
      // invalid URL, skip
    }

    // Title-based tags
    const titleLower = (title || '').toLowerCase();
    for (const [keywords, tag] of TITLE_KEYWORD_TAG_MAP) {
      if (keywords.some((kw) => titleLower.includes(kw))) {
        tags.add(tag);
      }
    }

    // URL path-based hints
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/blog/') || urlLower.includes('/post/') || urlLower.includes('/article/')) tags.add('reading');
    if (urlLower.includes('/docs/') || urlLower.includes('/documentation/') || urlLower.includes('/api/')) tags.add('docs');
    if (urlLower.includes('/issues/') || urlLower.includes('/pull/')) tags.add('dev');

    return [...tags].slice(0, 5);
  },

  /**
   * Get all unique tags from a links array.
   * Returns sorted by frequency (most used first).
   * @param {Array} links
   * @returns {string[]}
   */
  getAllTags(links) {
    const freq = {};
    links.forEach((link) => {
      (link.tags || []).forEach((tag) => {
        freq[tag] = (freq[tag] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  },

  /**
   * Get auto-grouped collections from links.
   * Groups by first/primary tag.
   * @param {Array} links
   * @returns {Object} { tagName: [links] }
   */
  getCollections(links) {
    const collections = {};
    links.forEach((link) => {
      const tag = (link.tags && link.tags[0]) || 'other';
      if (!collections[tag]) collections[tag] = [];
      collections[tag].push(link);
    });
    return collections;
  },
};
