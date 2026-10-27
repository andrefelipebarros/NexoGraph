'use client';

import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, PencilRuler, Search, X } from 'lucide-react';
import { designPatterns, patternFamilies, type DesignPattern } from './design-patterns';

type Props = {
  open: boolean;
  onClose: () => void;
  onChoose: (pattern: DesignPattern, target: 'manual' | 'teaching') => void;
};

export function PatternLibrary({ open, onClose, onChoose }: Props) {
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('Todos');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return designPatterns.filter((pattern) => (family === 'Todos' || pattern.family === family) && `${pattern.name} ${pattern.category} ${pattern.intent} ${pattern.useCase}`.toLowerCase().includes(term));
  }, [family, search]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="patterns-title">
        <header className="modal-head">
          <div>
            <h2 id="patterns-title">Design Patterns</h2>
            <p>Abra o padrão como diagrama para editar, ou como uma aula que revela uma peça por vez.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar biblioteca" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="modal-filters">
          <label className="search-box">
            <Search size={14} aria-hidden="true" />
            <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, problema ou uso: Observer, cache, fila…" aria-label="Buscar design patterns" />
          </label>
          <select className="field" value={family} onChange={(event) => setFamily(event.target.value)} aria-label="Filtrar por família">
            {patternFamilies.map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>
        <p className="modal-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'padrão' : 'padrões'}</p>
        <div className="modal-grid">
          {filtered.map((pattern) => (
            <article className="pattern" key={`${pattern.family}-${pattern.name}`}>
              <div className="pattern-tags"><span>{pattern.family}</span><span>{pattern.category}</span></div>
              <h3>{pattern.name}</h3>
              <p>{pattern.intent}</p>
              <small>Exemplo: {pattern.useCase}</small>
              <div className="pattern-actions">
                <button type="button" className="btn btn-sm" onClick={() => onChoose(pattern, 'manual')}><PencilRuler size={13} aria-hidden="true" /> Abrir diagrama</button>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => onChoose(pattern, 'teaching')}><GraduationCap size={13} aria-hidden="true" /> Ensinar passo a passo</button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <p className="modal-empty">Nenhum padrão encontrado. Tente outra palavra ou escolha &quot;Todos&quot; nas famílias.</p>}
        </div>
        <footer className="modal-foot">
          <span>A biblioteca cresce com o projeto. Novos padrões entram em <code>design-patterns.ts</code>.</span>
          <button type="button" className="btn btn-sm" onClick={() => { setSearch(''); setFamily('Todos'); }}>Limpar filtros</button>
        </footer>
      </section>
    </div>
  );
}
