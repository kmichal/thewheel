interface RefreshButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function RefreshButton({ onClick, disabled }: RefreshButtonProps) {
  return (
    <button type="button" onClick={onClick} className="primary-btn" disabled={disabled}>
      Refresh Data
    </button>
  );
}
