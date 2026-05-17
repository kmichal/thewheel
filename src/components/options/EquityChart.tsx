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
    const barValue = averageCost ?? 0;
    const data = [{ category: 'Cost', value: barValue }];
    
    const crossLines = marketPrice ? [
      {
        type: 'line',
        value: marketPrice,
        stroke: '#ff4b4b',
        strokeWidth: 2,
        lineDash: [4, 4],
      }
    ] : [];

    const yMin = Math.min(barValue, marketPrice ?? barValue);
    const yMax = Math.max(barValue, marketPrice ?? barValue);
    const padding = (yMax - yMin) * 0.15 || yMax * 0.15 || 1;

    return {
      data,
      series: [
        {
          type: 'bar',
          xKey: 'category',
          yKey: 'value',
          fill: averageCost ? '#ff9933' : '#666',
          stroke: averageCost ? '#cc7a29' : '#444',
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
          min: Math.max(0, yMin - padding),
          max: yMax + padding,
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
