import { palette } from '../../data/mockData';
import type { ThemeMode } from '../../types/app';

export type ChartColorKey = 'primary' | 'accent' | 'track' | 'warning';

export type ChartThemeTokens = {
  mode: ThemeMode;
  primary: string;
  accent: string;
  track: string;
  warning: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
  tooltipBg: string;
};

export function getChartTheme(mode: ThemeMode): ChartThemeTokens {
  const isDark = mode === 'dark';

  return {
    mode,
    primary: palette.primary,
    accent: palette.accent,
    track: isDark ? 'rgba(20, 184, 166, 0.18)' : 'rgba(20, 184, 166, 0.22)',
    warning: '#f59e0b',
    text: isDark ? '#ffffff' : palette.text,
    muted: isDark ? 'rgba(255, 255, 255, 0.68)' : 'rgba(15, 23, 42, 0.62)',
    surface: isDark ? '#1e3a8a' : palette.card,
    border: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(30, 58, 138, 0.12)',
    tooltipBg: isDark ? 'rgba(15, 23, 42, 0.96)' : '#ffffff',
  };
}

export function resolveChartColor(colorKey: ChartColorKey, theme: ChartThemeTokens) {
  return theme[colorKey];
}
