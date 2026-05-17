import { usePositions } from '../../hooks/usePositions';
import Sidebar from '../layout/Sidebar';
import OptionsPanel from '../options/OptionsPanel';
import PortfolioHeader from '../layout/PortfolioHeader';
import './PortfolioPage.css';

interface PortfolioPageProps {
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string) => void;
}

export default function PortfolioPage({ selectedSymbol, onSelectSymbol }: PortfolioPageProps) {
  const { positions, loading, error } = usePositions();

  return (
    <div className="portfolio-container">
      <PortfolioHeader />
      <div className="portfolio-content">
        <Sidebar 
          positions={positions} 
          selectedSymbol={selectedSymbol} 
          onSelectSymbol={onSelectSymbol} 
          loading={loading}
          error={error}
        />
        <OptionsPanel 
          selectedSymbol={selectedSymbol} 
          positions={positions}
        />
      </div>
    </div>
  );
}
