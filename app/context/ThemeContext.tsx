import React, { createContext, useContext, useState } from 'react';

const BASE = {
  mugenPink: '#FF2E63',
  mugenPinkDark: '#CC1744',
  mugenPinkGlow: 'rgba(255, 46, 99, 0.18)',
  white: '#FFFFFF',
  slateGray: '#94A3B8',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  success: '#00D395',
  cyan: '#00D4FF',
  purple: '#7C3AED',
};

const DARK_PALETTE = {
  ...BASE,
  bg: '#080810',
  card: '#12121E',
  surface: '#1A1A2E',
  elevated: '#22223A',
  border: 'rgba(255,255,255,0.07)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.25)',
  statusBar: 'light-content' as const,
};

const LIGHT_PALETTE = {
  ...BASE,
  bg: '#F4F4F8',
  card: '#FFFFFF',
  surface: '#EBEBF2',
  elevated: '#E0E0EA',
  border: 'rgba(0,0,0,0.07)',
  textPrimary: '#0D0D14',
  textSecondary: 'rgba(13,13,20,0.55)',
  textMuted: 'rgba(13,13,20,0.30)',
  statusBar: 'dark-content' as const,
};

export type AppColors = typeof DARK_PALETTE;

interface ThemeCtx {
  isDark: boolean;
  toggle: () => void;
  C: AppColors;
}

const ThemeContext = createContext<ThemeCtx>({
  isDark: false,
  toggle: () => {},
  C: LIGHT_PALETTE,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(false);
  return (
    <ThemeContext.Provider
      value={{ isDark, toggle: () => setIsDark(d => !d), C: isDark ? DARK_PALETTE : LIGHT_PALETTE }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useColors = () => useContext(ThemeContext);
