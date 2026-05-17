import type { Position } from '../../types/position';
import PositionsList from '../portfolio/PositionsList';
import Watchlist from '../portfolio/Watchlist';
import './Sidebar.css';

interface SidebarProps {
  positions: Position[];
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string) => void;
  loading: boolean;
  error: string | null;
}

export default function Sidebar({ positions, selectedSymbol, onSelectSymbol, loading, error }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>Positions</h3>
        <PositionsList 
          positions={positions} 
          selectedSymbol={selectedSymbol} 
          onSelectSymbol={onSelectSymbol}
          loading={loading}
          error={error}
        />
      </div>
      <div className="sidebar-section">
        <h3>Watch list</h3>
        <Watchlist 
          selectedSymbol={selectedSymbol} 
          onSelectSymbol={onSelectSymbol} 
        />
      </div>
    </div>
  );
}
