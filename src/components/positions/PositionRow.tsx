import type { Position } from '../../types/position';

interface PositionRowProps {
  position: Position;
}

export default function PositionRow({ position }: PositionRowProps) {
  const qty = position.position ?? 0;
  const isPos = qty > 0;
  const isNeg = qty < 0;
  const pnl = position.unrealizedPNL ?? 0;
  const isPnlPos = pnl > 0;
  const isPnlNeg = pnl < 0;

  return (
    <tr>
      <td className="symbol">{position.symbol || '-'}</td>
      <td>{position.secType || '-'}</td>
      <td className={`right-align ${isPos ? 'positive' : isNeg ? 'negative' : ''}`}>
        {position.position}
      </td>
      <td className="right-align">{position.averageCost?.toFixed(2) ?? '-'}</td>
      <td className="right-align">{position.marketPrice?.toFixed(2) ?? '-'}</td>
      <td className="right-align">{position.marketValue?.toFixed(2) ?? '-'}</td>
      <td
        className={`right-align pnl ${isPnlPos ? 'positive-bg' : isPnlNeg ? 'negative-bg' : ''}`}
      >
        {position.unrealizedPNL?.toFixed(2) ?? '-'}
      </td>
    </tr>
  );
}
