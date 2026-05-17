import { AgCharts } from 'ag-charts-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import { useMemo } from 'react';

ModuleRegistry.registerModules([AllCommunityModule]);

interface EquityChartProps {
  marketPrice: number | null;
  averageCost?: number;
}

export default function EquityChart({ marketPrice, averageCost }: EquityChartProps) {
  
  const options = useMemo<any>(() => {
    const data = [];
    if (averageCost) data.push({ category: 'Cost', value: averageCost });
    else data.push({ category: 'Cost', value: marketPrice || 0 });
    
    const crossLines = marketPrice ? [
      {
        type: 'line',
        value: marketPrice,
        stroke: '#ff4b4b',
        strokeWidth: 2,
        lineDash: [4, 4],
      }
    ] : [];

    return {
      data,
      series: [
        {
          type: 'bar',
          xKey: 'category',
          yKey: 'value',
          fill: '#ff9933',
          stroke: '#cc7a29',
          cornerRadius: 4,
        },
      ],
      axes: {
        x: {
          type: 'category',
          position: 'bottom',
        },
        y: {
          type: 'number',
          position: 'left',
          crossLines,
          label: {
            formatter: (params: any) => `$${params.value}`,
          }
        },
      },
      legend: { enabled: false },
      background: { fill: 'transparent' },
    };
  }, [marketPrice, averageCost]);

  return (
    <AgCharts options={options} style={{ width: '100%', height: '100%' }} />
  );
}
