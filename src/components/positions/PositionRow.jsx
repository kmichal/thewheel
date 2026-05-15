export default function PositionRow({ position }) {
  const isPos = position.position > 0;
  const isNeg = position.position < 0;
  const isPnlPos = position.unrealizedPNL > 0;
  const isPnlNeg = position.unrealizedPNL < 0;

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
