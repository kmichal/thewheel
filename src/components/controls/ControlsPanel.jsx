import RefreshButton from './RefreshButton';
import './ControlsPanel.css';

export default function ControlsPanel({ onRefresh, loading }) {
  return (
    <div className="controls-panel">
      <div className="action-area">
        <RefreshButton onClick={onRefresh} disabled={loading} />
      </div>
    </div>
  );
}
