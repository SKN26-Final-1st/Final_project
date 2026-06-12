import type { PieSeriesOption } from 'echarts/charts';
import type {
  GraphicComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import type { ComposeOption } from 'echarts/core';
import { type ChartColorKey, type ChartThemeTokens, resolveChartColor } from './chartTheme';

export type DonutSummaryData = {
  centerValue: number;
  centerLabel: string;
  segments: {
    label: string;
    value: number;
    colorKey: ChartColorKey;
  }[];
};

export type DonutChartOption = ComposeOption<
  PieSeriesOption | TooltipComponentOption | LegendComponentOption | GraphicComponentOption
>;

export function toDonutChartOption(data: DonutSummaryData, theme: ChartThemeTokens): DonutChartOption {
  return {
    animation: true,
    color: data.segments.map((segment) => resolveChartColor(segment.colorKey, theme)),
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      textStyle: {
        color: theme.text,
        fontFamily: '"Noto Sans KR Clean", "Noto Sans KR", system-ui, sans-serif',
      },
      valueFormatter: (value) => `${value}%`,
    },
    legend: {
      show: false,
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '43%',
        silent: true,
        style: {
          text: `${data.centerValue}%`,
          fill: theme.text,
          fontSize: 32,
          fontWeight: 800,
          align: 'center',
          verticalAlign: 'middle',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '58%',
        silent: true,
        style: {
          text: data.centerLabel,
          fill: theme.muted,
          fontSize: 12,
          fontWeight: 700,
          align: 'center',
          verticalAlign: 'middle',
        },
      },
    ],
    series: [
      {
        name: data.centerLabel,
        type: 'pie',
        radius: ['55%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        clockwise: true,
        startAngle: 90,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 4,
        },
        data: data.segments.map((segment) => ({
          name: segment.label,
          value: segment.value,
          itemStyle: {
            color: resolveChartColor(segment.colorKey, theme),
          },
        })),
      },
    ],
  };
}
