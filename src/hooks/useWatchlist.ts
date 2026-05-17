import { useState, useEffect } from 'react';

const STORAGE_KEY = 'thewheel_watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse watchlist', e);
    }
  }, []);

  const addSymbol = (symbol: string) => {
    const upper = symbol.toUpperCase().trim();
    if (upper && !watchlist.includes(upper)) {
      const next = [...watchlist, upper];
      setWatchlist(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const removeSymbol = (symbol: string) => {
    const next = watchlist.filter(s => s !== symbol);
    setWatchlist(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return { watchlist, addSymbol, removeSymbol };
}
