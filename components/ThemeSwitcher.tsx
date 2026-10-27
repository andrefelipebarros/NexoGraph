'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { applyTheme, themes, type ThemeId } from '@/lib/theme';
import { useTheme } from './use-theme';

export function ThemeSwitcher({ onChange, compact = false }: { onChange?: (id: ThemeId) => void; compact?: boolean }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = themes.find((item) => item.id === theme) ?? themes[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onPointer); window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="theme-switcher" ref={rootRef}>
      <button
        type="button"
        className="btn btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title="Trocar as cores do NexoGraph"
        onClick={() => setOpen((value) => !value)}
      >
        <Palette size={14} aria-hidden="true" />
        {!compact && <span>{current.label}</span>}
        {compact && <span className="sr-only">Tema: {current.label}</span>}
      </button>
      {open && (
        <div className="theme-menu" id={menuId} role="menu" aria-label="Temas de cor">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={item.id === theme}
              className="theme-option"
              onClick={() => { applyTheme(item.id); onChange?.(item.id); setOpen(false); }}
            >
              <span className="swatch" aria-hidden="true">
                {item.swatch.map((color) => <i key={color} style={{ background: color }} />)}
              </span>
              <span><strong>{item.label}</strong><small>{item.hint}</small></span>
              {item.id === theme && <Check size={15} className="check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
