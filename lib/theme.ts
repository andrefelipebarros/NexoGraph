export type ThemeId = 'grafite' | 'tokyo' | 'nord' | 'claro' | 'mono';

export const THEME_STORAGE_KEY = 'nexograph-theme';
export const THEME_EVENT = 'nexograph-theme-change';
export const DEFAULT_THEME: ThemeId = 'grafite';

export const themes: { id: ThemeId; label: string; hint: string; dark: boolean; swatch: [string, string, string] }[] = [
  { id: 'grafite', label: 'Grafite', hint: 'Escuro, estilo VS Code', dark: true, swatch: ['#1e1e1e', '#ffd700', '#da70d6'] },
  { id: 'tokyo', label: 'Tokyo Night', hint: 'Escuro azulado', dark: true, swatch: ['#1a1b26', '#e0af68', '#bb9af7'] },
  { id: 'nord', label: 'Nord', hint: 'Escuro frio e suave', dark: true, swatch: ['#2e3440', '#ebcb8b', '#b48ead'] },
  { id: 'claro', label: 'Papel', hint: 'Claro, para ambientes iluminados', dark: false, swatch: ['#ffffff', '#986801', '#a626a4'] },
  { id: 'mono', label: 'Preto e branco', hint: 'Alto contraste, ótimo para imprimir', dark: false, swatch: ['#ffffff', '#000000', '#6b6b6b'] },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && themes.some((theme) => theme.id === value);
}

/** Script executado antes da pintura para evitar o "flash" do tema errado. */
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;

export function readTheme(): ThemeId {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const current = document.documentElement.getAttribute('data-theme');
  return isThemeId(current) ? current : DEFAULT_THEME;
}

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id);
  try { localStorage.setItem(THEME_STORAGE_KEY, id); } catch { /* armazenamento indisponível */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Lê uma variável CSS do tema ativo (valores em hexadecimal). */
export function cssVar(name: string, fallback = '#888888') {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function isDarkTheme(id: ThemeId) {
  return themes.find((theme) => theme.id === id)?.dark ?? true;
}
