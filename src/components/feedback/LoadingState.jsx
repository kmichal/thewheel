import './Feedback.css';

export default function LoadingState({ message = 'Working...' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
}
