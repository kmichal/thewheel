import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import type { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import type { Position } from '../../types/position';
import './PositionsTable.css';

const modules = [AllCommunityModule];

function formatNumber(params: ValueFormatterParams<Position>) {
  const value = params.value as number | undefined;
  return value != null ? value.toFixed(2) : '-';
}

const columnDefs: ColDef<Position>[] = [
  { field: 'symbol', headerName: 'Symbol', sortable: true, filter: true, resizable: true },
  { field: 'secType', headerName: 'Asset Class', sortable: true, filter: true, resizable: true },
  {
    field: 'position',
    headerName: 'Position',
    sortable: true,
    filter: true,
    resizable: true,
    cellClass: ['right-align'],
  },
  {
    field: 'averageCost',
    headerName: 'Avg Price',
    sortable: true,
    filter: true,
    resizable: true,
    valueFormatter: formatNumber,
    cellClass: ['right-align'],
  },
  {
    field: 'marketPrice',
    headerName: 'Mkt Price',
    sortable: true,
    filter: true,
    resizable: true,
    valueFormatter: formatNumber,
    cellClass: ['right-align'],
  },
  {
    field: 'marketValue',
    headerName: 'Mkt Value',
    sortable: true,
    filter: true,
    resizable: true,
    valueFormatter: formatNumber,
    cellClass: ['right-align'],
  },
  {
    field: 'unrealizedPNL',
    headerName: 'Unrealized PNL',
    sortable: true,
    filter: true,
    resizable: true,
    valueFormatter: formatNumber,
    cellClass: (params) => {
      const value = params.value as number | undefined;
      if (value == null) {
        return ['right-align', 'pnl'];
      }
      return ['right-align', 'pnl', value > 0 ? 'positive-bg' : value < 0 ? 'negative-bg' : ''];
    },
  },
];

interface PositionsTableProps {
  positions: Position[];
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <AgGridProvider modules={modules}>
      <div className="table-wrapper">
        <AgGridReact
          rowData={positions}
          columnDefs={columnDefs}
          animateRows={true}
          domLayout="autoHeight"
          overlayNoRowsTemplate={
            '<span class="empty-state">No positions found. Try fetching data.</span>'
          }
          pagination={true}
          paginationPageSize={10}
        />
      </div>
    </AgGridProvider>
  );
}
