import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ListPosition {
  wordId: string;
  top: number;
}

// Keep only the most recently opened card for this list. The history entry key
// distinguishes a return trip from a fresh visit with identical filters.
export function useWordListPosition(ready: boolean) {
  const location = useLocation();
  const storageKey = 'word-list-position:' + location.pathname;
  const entry = location.key + location.search;

  useLayoutEffect(() => {
    if (!ready) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (saved?.entry !== entry || !Number.isFinite(saved.top)) return;
      const row = document.getElementById('word-row-' + saved.wordId);
      if (!row) return;
      row.focus({ preventScroll: true });
      window.scrollBy({ top: row.getBoundingClientRect().top - saved.top, behavior: 'instant' });
      sessionStorage.removeItem(storageKey);
    } catch { /* Navigation also works when session storage is unavailable. */ }
  }, [entry, ready, storageKey]);

  return function remember(wordId: string) {
    const row = document.getElementById('word-row-' + wordId);
    if (!row) return;
    const position: ListPosition = { wordId, top: row.getBoundingClientRect().top };
    try { sessionStorage.setItem(storageKey, JSON.stringify({ entry, ...position })); }
    catch { /* The URL still preserves the query, filters and expanded count. */ }
  };
}

export function listLimit(params: URLSearchParams, pageSize: number) {
  const value = Number(params.get('count'));
  return Number.isSafeInteger(value) && value >= pageSize ? value : pageSize;
}
