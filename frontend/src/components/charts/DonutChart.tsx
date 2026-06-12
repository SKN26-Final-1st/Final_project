import { useMemo } from 'react';
import type { ThemeMode } from '../../types/app';
import { type DonutSummaryData, toDonutChartOption } from './chartAdapters';
import { EChart } from './EChart';
import { getChartTheme } from './chartTheme';

type DonutChartProps = {
  data: DonutSummaryData;
  mode: ThemeMode;
};

export function DonutChart({ data, mode }: DonutChartProps) {
  const option = useMemo(() => toDonutChartOption(data, getChartTheme(mode)), [data, mode]);

  return (
    <EChart
      ariaLabel={`${data.centerLabel} ${data.centerValue}% 도넛 차트`}
      className="echart-donut"
      option={option}
      renderer="svg"
    />
  );
}
