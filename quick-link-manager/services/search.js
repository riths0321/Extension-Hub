/**
 * SearchService — fuzzy search and tag-based filtering.
 */

export const SearchService = {

  /**
   * Filter links by query string (fuzzy) and active tags.
   * @param {Array} links - full link array
   * @param {string} query - search term
   * @param {Set<string>} activeTags - set of selected tag filters
   * @param {string} currentDomain - active tab's domain for domain priority
   * @returns {Array} filtered + scored links
   */
  filter(links, query = '', activeTags = new Set(), currentDomain = '') {
    let results = links;

    // Tag filter (AND logic — link must have ALL selected tags)
    if (activeTags.size > 0) {
      results = results.filter((link) =>
        [...activeTags].every((tag) => (link.tags || []).includes(tag))
      );
    }

    // Query filter (fuzzy)
    if (query.trim()) {
      const scored = results.map((link) => ({
        link,
        score: this._fuzzyScore(link, query.trim().toLowerCase()),
      }));
      results = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.link);
    } else if (currentDomain) {
      // No query → sort by domain relevance
      results = [...results].sort((a, b) => {
        const aMatch = (a.url || '').includes(currentDomain) ? 1 : 0;
        const bMatch = (b.url || '').includes(currentDomain) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return results;
  },

  /**
   * Compute a fuzzy match score. Higher = better match.
   * Scores: exact match in title (10), starts with (8),
   * includes (5), domain match (4), tag match (3), partial (1).
   * Returns 0 if no match.
   * @param {Object} link
   * @param {string} query lowercase
   * @returns {number}
   */
  _fuzzyScore(link, query) {
    let score = 0;
    const title = (link.title || '').toLowerCase();
    const url = (link.url || '').toLowerCase();
    const note = (link.note || '').toLowerCase();
    const tags = (link.tags || []).join(' ').toLowerCase();

    if (title === query) score += 10;
    else if (title.startsWith(query)) score += 8;
    else if (title.includes(query)) score += 5;
    else if (this._fuzzyIncludes(title, query)) score += 2;

    if (url.includes(query)) score += 4;
    if (tags.includes(query)) score += 3;
    if (note.includes(query)) score += 2;

    return score;
  },

  /**
   * Check if all chars of query appear in order in str.
   * (lightweight trigram-free fuzzy match)
   * @param {string} str
   * @param {string} query
   * @returns {boolean}
   */
  _fuzzyIncludes(str, query) {
    if (!query) return true;
    let qi = 0;
    for (let si = 0; si < str.length && qi < query.length; si++) {
      if (str[si] === query[qi]) qi++;
    }
    return qi === query.length;
  },
};
