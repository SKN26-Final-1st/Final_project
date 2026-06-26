import { themePalette } from '../../data/themeTokens';
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
  const currentPalette = isDark ? themePalette.dark : themePalette.light;

  return {
    mode,
    primary: currentPalette.primary,
    accent: currentPalette.accent,
    track: currentPalette.accentSoft,
    warning: currentPalette.warning,
    text: currentPalette.text,
    muted: currentPalette.muted,
    surface: currentPalette.card,
    border: currentPalette.border,
    tooltipBg: currentPalette.card,
  };
}

export function resolveChartColor(colorKey: ChartColorKey, theme: ChartThemeTokens) {
  return theme[colorKey];
}
