import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { PieChart } from 'echarts/charts';
import { GraphicComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { DonutChartOption } from './chartAdapters';

echarts.use([PieChart, TooltipComponent, LegendComponent, GraphicComponent, SVGRenderer]);

type EChartProps = {
  ariaLabel: string;
  className?: string;
  option: DonutChartOption;
  renderer?: 'svg';
  style?: CSSProperties;
};

export function EChart({ ariaLabel, className, option, renderer = 'svg', style }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    chartRef.current = echarts.init(containerRef.current, null, { renderer });

    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [renderer]);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      aria-label={ariaLabel}
      className={className}
      ref={containerRef}
      role="img"
      style={style}
    />
  );
}
