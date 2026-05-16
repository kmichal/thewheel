import { useState, useEffect, useCallback } from 'react';
import ibkr, { Portfolios } from '../api/ibkr';
import type { Position } from '../types/position';

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPositions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPositions([]);

    try {
      const started = await ibkr();
      if (!started) {
        throw new Error(
          'IBKR not connected. Ensure TWS/Gateway is running and API is enabled.'
        );
      }
      const data = await Portfolios.Instance.getPortfolios();
      setPositions(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only data load
    void loadPositions();
  }, [loadPositions]);

  return { positions, loading, error, refresh: loadPositions };
}
