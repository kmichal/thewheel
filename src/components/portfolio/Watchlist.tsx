import { useState } from 'react';
import { useWatchlist } from '../../hooks/useWatchlist';
import './ListStyles.css';

interface WatchlistProps {
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string) => void;
}

export default function Watchlist({ selectedSymbol, onSelectSymbol }: WatchlistProps) {
  const { watchlist, addSymbol, removeSymbol } = useWatchlist();
  const [newSymbol, setNewSymbol] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol.trim()) {
      addSymbol(newSymbol);
      setNewSymbol('');
    }
  };

  return (
    <div className="watchlist-container">
      <div className="symbol-list">
        {watchlist.length === 0 ? (
          <div className="list-message">Watchlist is empty</div>
        ) : (
          watchlist.map((symbol) => (
            <div 
              key={symbol}
              className={`symbol-list-item ${selectedSymbol === symbol ? 'active' : ''}`}
              onClick={() => onSelectSymbol(symbol)}
            >
              <span>{symbol}</span>
              <button 
                className="remove-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  removeSymbol(symbol);
                }}
                title="Remove from watchlist"
              >
                &times;
              </button>
            </div>
          ))
        )}
      </div>
      <form className="add-symbol-form" onSubmit={handleAdd}>
        <input 
          type="text" 
          value={newSymbol} 
          onChange={(e) => setNewSymbol(e.target.value)} 
          placeholder="Add symbol..." 
          maxLength={10}
        />
        <button type="submit" disabled={!newSymbol.trim()}>+</button>
      </form>
    </div>
  );
}
