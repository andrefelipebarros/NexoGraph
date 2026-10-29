'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  description?: string;
  closeLabel?: string;
  size?: 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, titleId, title, description, closeLabel = 'Fechar', size = 'lg', children, footer }: Props) {
  const dialogRef = useRef<HTMLElement>(null);

  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) => item.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(document.activeElement)) return;
      const preferred = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog.querySelector<HTMLElement>(FOCUSABLE);
      preferred?.focus();
    });
    const onKey = (event: KeyboardEvent) => handleKey(event);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label={closeLabel} title={`${closeLabel} (Esc)`} onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        {children}
        {footer && <footer className="modal-foot">{footer}</footer>}
      </section>
    </div>
  );
}
