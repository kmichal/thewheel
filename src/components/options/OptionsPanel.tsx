import { useMemo, useState, useEffect } from 'react';
import { useOptionsData } from '../../hooks/useOptionsData';
import type { Position } from '../../types/position';
import type { OptionContract } from '../../api/ibkr';
import HorizontalLineChart from './HorizontalLineChart';
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

  // Local state to track selected options
  const [selectedCall, setSelectedCall] = useState<OptionContract | null>(null);
  const [selectedPut, setSelectedPut] = useState<OptionContract | null>(null);

  // Reset selected options when symbol or expiration changes
  useEffect(() => {
    setSelectedCall(null);
    setSelectedPut(null);
  }, [selectedSymbol, selectedExpiration]);

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

  // Find the equity (stock) position to display details in the metrics panel
  const stockPosition = positions.find(
    p => p.symbol === selectedSymbol && (p.secType?.toUpperCase() === 'STK' || !p.secType)
  );

  const chartLines = useMemo(() => {
    const lines = [] as Array<{ id: string; value: number; label: string; style: { color: string; strokeDasharray?: string } }>;
    
    if (marketPrice != null) {
      lines.push({
        id: 'marketPrice',
        value: marketPrice,
        label: 'Market price',
        style: { color: '#4b5563', strokeDasharray: '' }, // Solid and dark gray
      });
    }
    
    if (averageCost !== undefined) {
      lines.push({
        id: 'averageCost',
        value: averageCost,
        label: 'Average cost',
        style: { 
          // Green if average cost is below market price, red if above
          color: averageCost < (marketPrice ?? 0) ? '#22c55e' : '#ef4444' 
        },
      });
    }

    if (selectedCall) {
      lines.push({
        id: 'selectedCall',
        value: selectedCall.strike,
        label: `Call Strike: $${selectedCall.strike}`,
        style: { color: '#8b5cf6' }, // Violet
      });
    }

    if (selectedPut) {
      lines.push({
        id: 'selectedPut',
        value: selectedPut.strike,
        label: `Put Strike: $${selectedPut.strike}`,
        style: { color: '#f97316' }, // Orange
      });
    }

    return lines;
  }, [marketPrice, averageCost, selectedCall, selectedPut]);

  const chartBounds = useMemo(() => {
    if (chartLines.length === 0) {
      return { yMin: 0, yMax: 100 };
    }

    const values = chartLines.map((line) => line.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = Math.max((maxValue - minValue) * 0.15, maxValue * 0.05, 1);

    return {
      yMin: Math.max(0, minValue - padding),
      yMax: maxValue + padding,
    };
  }, [chartLines]);

  // Calculate potential profit and obligation values for selected options
  const callPremium = selectedCall ? (selectedCall.bid || selectedCall.ask || 0) * 100 : 0;
  const putPremium = selectedPut ? (selectedPut.bid || selectedPut.ask || 0) * 100 : 0;
  const totalPremium = callPremium + putPremium;

  const callObligation = selectedCall ? selectedCall.strike * 100 : 0;
  const putObligation = selectedPut ? selectedPut.strike * 100 : 0;
  const totalObligation = callObligation + putObligation;

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

            <div className="chart-and-metrics-section">
              <div className="chart-container">
                <HorizontalLineChart
                  lines={chartLines}
                  yMin={chartBounds.yMin}
                  yMax={chartBounds.yMax}
                  yTickCount={6}
                  width={500}
                  height={420}
                  title="Price levels"
                />
              </div>

              <div className="metrics-panel">
                <h3 className="metrics-title">Position & Options Metrics</h3>
                
                {/* Current Stock Position P&L */}
                {stockPosition ? (
                  <div className="metrics-group position-metrics">
                    <div className="metrics-group-title">Stock Position ({selectedSymbol})</div>
                    <div className="metrics-row">
                      <span className="metrics-label">Shares:</span>
                      <span className="metrics-value font-mono">{stockPosition.position}</span>
                    </div>
                    <div className="metrics-row">
                      <span className="metrics-label">Average Cost:</span>
                      <span className="metrics-value font-mono">${stockPosition.averageCost?.toFixed(2)}</span>
                    </div>
                    <div className="metrics-row">
                      <span className="metrics-label">Current P&L:</span>
                      <span className={`metrics-value font-mono pnl-value ${
                        (stockPosition.unrealizedPNL ?? 0) > 0 ? 'positive' : (stockPosition.unrealizedPNL ?? 0) < 0 ? 'negative' : ''
                      }`}>
                        {(stockPosition.unrealizedPNL ?? 0) >= 0 ? '+' : ''}${stockPosition.unrealizedPNL?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="metrics-group no-position">
                    <div className="metrics-group-title">Stock Position ({selectedSymbol})</div>
                    <div className="metrics-placeholder-text">No active equity position in {selectedSymbol}.</div>
                  </div>
                )}

                {/* Selected Options Metrics */}
                <div className="metrics-group options-metrics">
                  <div className="metrics-group-title">Selected Contracts</div>
                  {!selectedCall && !selectedPut ? (
                    <div className="metrics-placeholder-text">
                      Select option contracts from the table below to analyze potential profits and obligations.
                    </div>
                  ) : (
                    <div className="selected-options-list">
                      {selectedCall && (
                        <div className="option-metric-item call">
                          <div className="option-header">
                            <span className="option-badge call">Call</span>
                            <span className="option-strike font-mono">${selectedCall.strike} Strike</span>
                            <span className="option-exp">{selectedCall.expiration.substring(4,6)}/{selectedCall.expiration.substring(6,8)}</span>
                          </div>
                          <div className="metrics-sub-row">
                            <span>Bid: ${selectedCall.bid?.toFixed(2) || '0.00'}</span>
                            <span>Ask: ${selectedCall.ask?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="metrics-sub-row calculation">
                            <span>Est. Premium: <strong className="call-color">${((selectedCall.bid || selectedCall.ask || 0) * 100).toFixed(2)}</strong></span>
                            <span>Obligation: <strong>${(selectedCall.strike * 100).toFixed(2)}</strong></span>
                          </div>
                        </div>
                      )}

                      {selectedPut && (
                        <div className="option-metric-item put">
                          <div className="option-header">
                            <span className="option-badge put">Put</span>
                            <span className="option-strike font-mono">${selectedPut.strike} Strike</span>
                            <span className="option-exp">{selectedPut.expiration.substring(4,6)}/{selectedPut.expiration.substring(6,8)}</span>
                          </div>
                          <div className="metrics-sub-row">
                            <span>Bid: ${selectedPut.bid?.toFixed(2) || '0.00'}</span>
                            <span>Ask: ${selectedPut.ask?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="metrics-sub-row calculation">
                            <span>Est. Premium: <strong className="put-color">${((selectedPut.bid || selectedPut.ask || 0) * 100).toFixed(2)}</strong></span>
                            <span>Obligation: <strong>${(selectedPut.strike * 100).toFixed(2)}</strong></span>
                          </div>
                        </div>
                      )}

                      <div className="metrics-totals">
                        <div className="metrics-row total-row">
                          <span className="metrics-label">Total Potential Profit:</span>
                          <span className="metrics-value profit-highlight font-mono">
                            +${totalPremium.toFixed(2)}
                          </span>
                        </div>
                        <div className="metrics-row total-row">
                          <span className="metrics-label">Total Obligations Value:</span>
                          <span className="metrics-value obligation-highlight font-mono">
                            ${totalObligation.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="chain-section">
              <OptionsChain 
                expirations={expirations}
                selectedExpiration={selectedExpiration}
                onSelectExpiration={setSelectedExpiration}
                chain={chain}
                loading={loadingChain}
                selectedCall={selectedCall}
                selectedPut={selectedPut}
                onSelectCall={setSelectedCall}
                onSelectPut={setSelectedPut}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

