import { useState, useEffect } from 'react';
import { fetchMarketData, fetchOptionsExpirations, fetchOptionsChain } from '../api/ibkr';
import type { OptionContract } from '../api/ibkr';

export function useOptionsData(symbol: string | null) {
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null);
  const [chain, setChain] = useState<OptionContract[]>([]);
  const [loadingExpirations, setLoadingExpirations] = useState(false);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setMarketPrice(null);
      setExpirations([]);
      setSelectedExpiration(null);
      setChain([]);
      setError(null);
      return;
    }

    let isSubscribed = true;

    const loadData = async () => {
      setLoadingExpirations(true);
      setError(null);
      setMarketPrice(null);
      setExpirations([]);
      setSelectedExpiration(null);
      setChain([]);

      try {
        const [price, exps] = await Promise.all([
          fetchMarketData(symbol).catch(() => null), // Price is optional for the flow, don't fail if it times out
          fetchOptionsExpirations(symbol)
        ]);

        if (isSubscribed) {
          if (price) setMarketPrice(price);
          setExpirations(exps);
          if (exps.length > 0) {
            setSelectedExpiration(exps[0]);
          }
        }
      } catch (err: any) {
        if (isSubscribed) {
          setError(err.message || 'Failed to load options expirations');
        }
      } finally {
        if (isSubscribed) setLoadingExpirations(false);
      }
    };

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !selectedExpiration) {
      setChain([]);
      return;
    }

    let isSubscribed = true;

    const loadChain = async () => {
      setLoadingChain(true);
      setError(null);
      
      try {
        const data = await fetchOptionsChain(symbol, selectedExpiration);
        if (isSubscribed) {
          setChain(data);
        }
      } catch (err: any) {
        if (isSubscribed) {
          setError(err.message || 'Failed to load options chain');
        }
      } finally {
        if (isSubscribed) setLoadingChain(false);
      }
    };

    loadChain();

    return () => {
      isSubscribed = false;
    };
  }, [symbol, selectedExpiration]);

  return {
    marketPrice,
    expirations,
    selectedExpiration,
    setSelectedExpiration,
    chain,
    loadingExpirations,
    loadingChain,
    error
  };
}
