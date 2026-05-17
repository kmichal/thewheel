import { useOptionsData } from '../../hooks/useOptionsData';
import type { Position } from '../../types/position';
import EquityChart from './EquityChart';
import OptionsChain from './OptionsChain';
import './OptionsPanel.css';

interface OptionsPanelProps {
  selectedSymbol: string | null;
  positions: Position[];
}

export default function OptionsPanel({ selectedSymbol, positions }: OptionsPanelProps) {
  const { 
    marketPrice, 
    expirations, 
    selectedExpiration, 
    setSelectedExpiration, 
    chain, 
    loadingExpirations, 
    loadingChain, 
    error 
  } = useOptionsData(selectedSymbol);

  // Find average cost if user owns this equity
  const ownedPositions = positions.filter(p => p.symbol === selectedSymbol);
  // Calculate weighted average cost if there are multiple positions
  let averageCost: number | undefined;
  if (ownedPositions.length > 0) {
    const totalCost = ownedPositions.reduce((acc, p) => acc + ((p.averageCost || 0) * (p.position || 0)), 0);
    const totalShares = ownedPositions.reduce((acc, p) => acc + (p.position || 0), 0);
    if (totalShares > 0) {
      averageCost = totalCost / totalShares;
    }
  }

  return (
    <div className="options-panel">
      <div className="options-tabs">
        <button className="tab active">Options</button>
      </div>
      
      <div className="options-content">
        {!selectedSymbol ? (
          <div className="empty-state">
            <h2>Pick an equity</h2>
            <p>Select a symbol from your positions or watch list to view options data.</p>
          </div>
        ) : (
          <div className="options-dashboard">
            <div className="dashboard-header">
              <h2>{selectedSymbol} Options</h2>
              {loadingExpirations && <span className="loading-badge">Loading...</span>}
              {error && <span className="error-badge">{error}</span>}
            </div>

            <div className="chart-section">
              <EquityChart 
                marketPrice={marketPrice} 
                averageCost={averageCost} 
              />
            </div>

            <div className="chain-section">
              <OptionsChain 
                expirations={expirations}
                selectedExpiration={selectedExpiration}
                onSelectExpiration={setSelectedExpiration}
                chain={chain}
                loading={loadingChain}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
