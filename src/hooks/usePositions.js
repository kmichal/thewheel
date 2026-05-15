import { useState, useEffect, useCallback } from 'react';
import ibkr, { Portfolios } from '../api/ibkr';

export function usePositions() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  return { positions, loading, error, refresh: loadPositions };
}
