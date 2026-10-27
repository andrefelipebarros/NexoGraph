'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_THEME, THEME_EVENT, readTheme, type ThemeId } from '@/lib/theme';

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/** Tema ativo, lido do atributo data-theme da página. */
export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
}
