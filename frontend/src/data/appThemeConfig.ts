import { theme as antdTheme, type ThemeConfig } from 'antd';
import { radiusTokens, themePalette } from './themeTokens';
import type { ThemeMode } from '../types/app';

export function createAppThemeConfig(mode: ThemeMode): ThemeConfig {
  const palette = mode === 'dark' ? themePalette.dark : themePalette.light;
  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: palette.primary,
      colorInfo: palette.primary,
      colorSuccess: palette.accent,
      colorBgBase: palette.background,
      colorBgContainer: palette.card,
      colorBorder: palette.border,
      colorTextBase: palette.text,
      colorTextSecondary: palette.muted,
      fontFamily: '"Noto Sans KR Clean", "Noto Sans KR", system-ui, sans-serif',
      borderRadius: radiusTokens.md,
    },
    components: {
      Card: { borderRadiusLG: radiusTokens.lg },
      Button: { borderRadius: radiusTokens.sm + 2, controlHeight: 40 },
      Input: { borderRadius: radiusTokens.sm + 2 },
      Select: { borderRadius: radiusTokens.sm + 2 },
    },
  };
}
