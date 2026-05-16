import RefreshButton from './RefreshButton';
import './ControlsPanel.css';

interface ControlsPanelProps {
  onRefresh: () => void;
  loading: boolean;
}

export default function ControlsPanel({ onRefresh, loading }: ControlsPanelProps) {
  return (
    <div className="controls-panel">
      <div className="action-area">
        <RefreshButton onClick={onRefresh} disabled={loading} />
      </div>
    </div>
  );
}
