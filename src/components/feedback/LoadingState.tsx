import './Feedback.css';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Working...' }: LoadingStateProps) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
}
