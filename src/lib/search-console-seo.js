const STORAGE_KEY = 'parca_avcisi_search_queries';

function normalizeQuery(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
}

function isUsefulQuery(query) {
  if (query.length < 3 || query.length > 120) return false;
  if (/^(https?:\/\/|www\.)/i.test(query)) return false;
  return /[a-zçğıöşü0-9]/i.test(query);
}

export function recordSearchQuery(query, source = 'site-search') {
  const normalized = normalizeQuery(query);
  if (!isUsefulQuery(normalized)) return;
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const item = current[normalized] || { query: normalized, count: 0, firstSeen: Date.now() };
    item.count += 1;
    item.lastSeen = Date.now();
    item.source = source;
    current[normalized] = item;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (_) {}
}

export function getRecordedSearchQueries(limit = 50) {
  try {
    return Object.values(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'))
      .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen)
      .slice(0, limit);
  } catch (_) {
    return [];
  }
}

// Search Console integration is intentionally read-only and server-side in the future.
// The Search Console API requires OAuth authorization; credentials must never be shipped to the browser.
export const searchConsoleSeoReady = true;
