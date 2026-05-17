import type { Position } from '../../types/position';
import './ListStyles.css';

interface PositionsListProps {
  positions: Position[];
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string) => void;
  loading: boolean;
  error: string | null;
}

export default function PositionsList({ positions, selectedSymbol, onSelectSymbol, loading, error }: PositionsListProps) {
  if (loading) return <div className="list-message">Loading...</div>;
  if (error) return <div className="list-message error">Error loading positions</div>;
  
  if (positions.length === 0) {
    return <div className="list-message">No open positions</div>;
  }

  // Deduplicate symbols (since a user can have multiple positions for the same symbol)
  const uniqueSymbols = Array.from(new Set(positions.map(p => p.symbol).filter(Boolean))) as string[];

  return (
    <div className="symbol-list">
      {uniqueSymbols.map((symbol) => (
        <div 
          key={symbol}
          className={`symbol-list-item ${selectedSymbol === symbol ? 'active' : ''}`}
          onClick={() => onSelectSymbol(symbol)}
        >
          {symbol}
        </div>
      ))}
    </div>
  );
}
