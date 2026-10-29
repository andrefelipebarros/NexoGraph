'use client';

import { useMemo, useState } from 'react';
import { GraduationCap, PencilRuler, Search } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { designPatterns, patternFamilies, type DesignPattern } from './design-patterns';

type Props = {
  open: boolean;
  onClose: () => void;
  onChoose: (pattern: DesignPattern, target: 'manual' | 'teaching') => void;
};

export function PatternLibrary({ open, onClose, onChoose }: Props) {
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('Todos');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return designPatterns.filter((pattern) => (family === 'Todos' || pattern.family === family) && `${pattern.name} ${pattern.category} ${pattern.intent} ${pattern.useCase}`.toLowerCase().includes(term));
  }, [family, search]);

  const resetFilters = () => { setSearch(''); setFamily('Todos'); };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="patterns-title"
      title="Design Patterns"
      description="Abra o padrão como diagrama para editar, ou como uma aula que revela uma peça por vez."
      closeLabel="Fechar biblioteca"
      footer={(
        <>
          <span>{designPatterns.length} padrões em {patternFamilies.length - 1} famílias. Novos padrões entram em <code>design-patterns.ts</code>.</span>
          <button type="button" className="btn btn-sm" onClick={resetFilters} disabled={!search && family === 'Todos'}>Limpar filtros</button>
        </>
      )}
    >
      <div className="modal-filters">
        <label className="search-box">
          <Search size={14} aria-hidden="true" />
          <input data-autofocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, problema ou uso: Observer, cache, fila…" aria-label="Buscar design patterns" />
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
        {filtered.length === 0 && (
          <div className="modal-empty">
            <p>Nenhum padrão encontrado para essa busca.</p>
            <button type="button" className="btn btn-sm" onClick={resetFilters}>Mostrar todos</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
