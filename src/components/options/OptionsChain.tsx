import { useState } from 'react';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import type { OptionContract } from '../../api/ibkr';
import './OptionsChain.css';

const modules = [AllCommunityModule];

interface OptionsChainProps {
  expirations: string[];
  selectedExpiration: string | null;
  onSelectExpiration: (exp: string) => void;
  chain: OptionContract[];
  loading: boolean;
  selectedCall: OptionContract | null;
  selectedPut: OptionContract | null;
  onSelectCall: (call: OptionContract | null) => void;
  onSelectPut: (put: OptionContract | null) => void;
}

export default function OptionsChain({ 
  expirations, 
  selectedExpiration, 
  onSelectExpiration, 
  chain, 
  loading,
  selectedCall,
  selectedPut,
  onSelectCall,
  onSelectPut
}: OptionsChainProps) {
  const [activeTab, setActiveTab] = useState<'C' | 'P'>('C');

  // Filter chain by call/put
  const rowData = chain.filter(c => c.right === activeTab);

  const colDefs: ColDef<OptionContract>[] = [
    { field: 'expiration', headerName: 'Expiration', width: 120 },
    { 
      field: 'expiration', 
      headerName: 'Days to expiration',
      width: 200,
      valueGetter: (params) => {
        if (!params.data) return '';
        const exp = params.data.expiration; // e.g. "20260320"
        if (exp.length === 8) {
          const year = parseInt(exp.substring(0, 4));
          const month = parseInt(exp.substring(4, 6)) - 1;
          const day = parseInt(exp.substring(6, 8));
          const expDate = new Date(year, month, day);
          const today = new Date();
          const diffTime = Math.abs(expDate.getTime() - today.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays;
        }
        return '';
      }
    },
    { field: 'strike', headerName: 'Strike', width: 100, type: 'numericColumn' },
    { field: 'right', headerName: 'Type', width: 80, valueFormatter: (params) => params.value === 'C' ? 'Call' : 'Put' },
    { field: 'bid', headerName: 'Bid', width: 100, type: 'numericColumn' },
    { field: 'ask', headerName: 'Ask', width: 100, type: 'numericColumn' },
    { field: 'delta', headerName: 'Delta', width: 100, type: 'numericColumn' },
    { field: 'volume', headerName: 'Volume', width: 100, type: 'numericColumn' },
    { field: 'openInterest', headerName: 'Open Interest', width: 130, type: 'numericColumn' },
  ];

  // Custom row styling rules to highlight the selected Call or Put row
  const rowClassRules = {
    'selected-row-call': (params: any) => {
      return !!(selectedCall && params.data && params.data.symbol === selectedCall.symbol);
    },
    'selected-row-put': (params: any) => {
      return !!(selectedPut && params.data && params.data.symbol === selectedPut.symbol);
    },
  };

  // Toggle selection on row click
  const onRowClicked = (event: any) => {
    const contract = event.data as OptionContract;
    if (contract.right === 'C') {
      if (selectedCall && selectedCall.symbol === contract.symbol) {
        onSelectCall(null);
      } else {
        onSelectCall(contract);
      }
    } else if (contract.right === 'P') {
      if (selectedPut && selectedPut.symbol === contract.symbol) {
        onSelectPut(null);
      } else {
        onSelectPut(contract);
      }
    }
  };

  return (
    <div className="options-chain-container">
      <div className="chain-controls">
        <div className="expiration-selector">
          <label>Expirations</label>
          <select 
            value={selectedExpiration || ''} 
            onChange={(e) => onSelectExpiration(e.target.value)}
            disabled={expirations.length === 0}
          >
            {expirations.length === 0 && <option value="">No expirations</option>}
            {expirations.map(exp => (
              <option key={exp} value={exp}>
                {exp.length === 8 ? `${exp.substring(4,6)}/${exp.substring(6,8)}/${exp.substring(0,4)}` : exp}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chain-tabs">
        <button 
          className={`chain-tab ${activeTab === 'C' ? 'active' : ''}`}
          onClick={() => setActiveTab('C')}
        >
          Calls
        </button>
        <button 
          className={`chain-tab ${activeTab === 'P' ? 'active' : ''}`}
          onClick={() => setActiveTab('P')}
        >
          Puts
        </button>
      </div>

      <div className="chain-grid-wrapper">
        {loading ? (
          <div className="chain-loading">Loading chain...</div>
        ) : (
          <AgGridProvider modules={modules}>
            <div style={{ width: '100%' }}>
              <AgGridReact
                rowData={rowData}
                columnDefs={colDefs}
                domLayout="autoHeight"
                rowClassRules={rowClassRules}
                onRowClicked={onRowClicked}
              />
            </div>
          </AgGridProvider>
        )}
      </div>
    </div>
  );
}
