export default function RefreshButton({ onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} className="primary-btn" disabled={disabled}>
      Refresh Data
    </button>
  );
}
