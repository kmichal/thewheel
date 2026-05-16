import PositionRow from './PositionRow';
import type { Position } from '../../types/position';
import './PositionsTable.css';

interface Column {
  key: keyof Position | 'symbol';
  label: string;
  align?: 'right';
}

const COLUMNS: Column[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'secType', label: 'Asset Class' },
  { key: 'position', label: 'Position', align: 'right' },
  { key: 'averageCost', label: 'Avg Price', align: 'right' },
  { key: 'marketPrice', label: 'Mkt Price', align: 'right' },
  { key: 'marketValue', label: 'Mkt Value', align: 'right' },
  { key: 'unrealizedPNL', label: 'Unrealized PNL', align: 'right' },
];

function rowKey(position: Position, index: number): string | number {
  return position.conId ?? `${position.symbol}-${position.secType}-${index}`;
}

interface PositionsTableProps {
  positions: Position[];
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <div className="table-wrapper">
      <table className="positions-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'right-align' : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, index) => (
            <PositionRow key={rowKey(pos, index)} position={pos} />
          ))}
          {positions.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="empty-state">
                No positions found. Try fetching data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
