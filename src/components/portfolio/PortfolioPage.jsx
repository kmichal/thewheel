import { usePositions } from '../../hooks/usePositions';
import PortfolioHeader from '../layout/PortfolioHeader';
import ControlsPanel from '../controls/ControlsPanel';
import LoadingState from '../feedback/LoadingState';
import ErrorAlert from '../feedback/ErrorAlert';
import PositionsTable from '../positions/PositionsTable';
import './PortfolioPage.css';

export default function PortfolioPage() {
  const { positions, loading, error, refresh } = usePositions();

  return (
    <div className="portfolio-container">
      <PortfolioHeader />
      <ControlsPanel onRefresh={refresh} loading={loading} />

      {loading && <LoadingState />}
      {error && <ErrorAlert message={error} />}
      {!loading && !error && <PositionsTable positions={positions} />}
    </div>
  );
}
