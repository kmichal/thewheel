import { useState } from 'react';
import PortfolioPage from './components/portfolio/PortfolioPage';
import './App.css';

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  return (
    <div className="app-container">
      <PortfolioPage selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />
    </div>
  );
}
