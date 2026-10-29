'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { AlignLeft, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Check, Download, GitBranch, Layers, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { SketchBoard } from '@/components/SketchBoard';
import { colorPalette, createId } from './types';
import type { LessonLayout, Slide } from './types';

type Props = {
  title: string;
  slides: Slide[];
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>;
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  layout: LessonLayout;
  setLayout: React.Dispatch<React.SetStateAction<LessonLayout>>;
  onNotify: (message: string) => void;
  onOpenPatterns: () => void;
  onExport: () => void;
};

function parentOf(slides: Slide[], index: number): string | null {
  const slide = slides[index];
  if (!slide) return null;
  if (Object.prototype.hasOwnProperty.call(slide, 'parentId')) return slide.parentId ?? null;
  return index > 0 ? slides[index - 1].id : null;
}

export function TeachingBoard({ title, slides, setSlides, index, setIndex, layout, setLayout, onNotify, onOpenPatterns, onExport }: Props) {
  const [editing, setEditing] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const current = slides[index] ?? slides[0];
  const currentParent = parentOf(slides, index);

  const last = slides.length - 1;
  const goTo = (value: number) => setIndex(Math.min(last, Math.max(0, value)));

  const startPresenting = () => {
    setEditing(false);
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const stopPresenting = () => {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  const onPresentKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown' || event.key === 'Enter') { event.preventDefault(); goTo(index + 1); }
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp' || event.key === 'Backspace') { event.preventDefault(); goTo(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); goTo(0); }
    else if (event.key === 'End') { event.preventDefault(); goTo(last); }
    else if (event.key === 'Escape') stopPresenting();
  });

  const onFullscreenChange = useEffectEvent(() => {
    if (!document.fullscreenElement) setPresenting(false);
  });

  useEffect(() => {
    if (!presenting) return;
    const onKey = (event: KeyboardEvent) => onPresentKey(event);
    const onChange = () => onFullscreenChange();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onChange);
      document.body.style.overflow = overflow;
    };
  }, [presenting]);

  const move = (direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target > last) return;
    setSlides((list) => {
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setIndex(target);
    onNotify(direction < 0 ? 'Bloco movido para cima' : 'Bloco movido para baixo');
  };

  const update = (patch: Partial<Slide>) => setSlides((list) => list.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)));
  const add = () => {
    const parentId = layout === 'tree' || layout === 'tree-reverse' ? (current?.id ?? null) : (slides[slides.length - 1]?.id ?? null);
    const next: Slide = { id: createId('slide'), title: 'Novo bloco', subtitle: 'Apresente a ideia principal deste passo.', bullets: ['Primeiro ponto', 'Segundo ponto'], accent: colorPalette[slides.length % colorPalette.length].value, parentId };
    setSlides((list) => [...list, next]);
    setIndex(slides.length);
    setEditing(true);
  };
  const remove = () => {
    if (slides.length <= 1) { onNotify('A aula precisa ter pelo menos um bloco'); return; }
    const removed = slides[index];
    const oldParents = new Map(slides.map((slide, i) => [slide.id, parentOf(slides, i)] as const));
    const replacementParent = removed ? oldParents.get(removed.id) ?? null : null;
    const next = slides
      .filter((_, i) => i !== index)
      .map((slide) => ({ ...slide, parentId: oldParents.get(slide.id) === removed?.id ? replacementParent : oldParents.get(slide.id) ?? null }));
    setSlides(next);
    setIndex(Math.max(0, index - 1));
    setEditing(false);
  };

  const chooseLayout = (next: LessonLayout) => {
    setLayout(next);
    const message = next === 'linear' ? 'Aula organizada em sequência' : next === 'tree-reverse' ? 'Fluxo invertido ativado' : 'Modo Raiz: do topo para baixo';
    onNotify(message);
  };

  return (
    <div className="lesson">
      <aside className="lesson-side" aria-label="Blocos da aula">
        <section className="side-block lesson-intro">
          <span className="lesson-eyebrow"><GitBranch size={13} aria-hidden="true" /> ROTEIRO VISUAL</span>
          <h2 className="side-title">Como funciona</h2>
          <p className="side-help">
            {layout === 'linear'
              ? <>Cada clique em <b>Revelar próximo bloco</b> desenha a próxima etapa. Use <b>Raiz</b> quando quiser começar com a ideia principal no topo e desenvolver os ramos para baixo.</>
              : layout === 'tree'
                ? <>O primeiro bloco fica no topo como raiz. Cada bloco pode gerar vários ramos abaixo; edite um bloco para escolher de qual ideia ele nasce.</>
                : <>O modo <b>Invertida</b> mantém os blocos na horizontal, da direita para a esquerda, útil para narrativas em sentido oposto.</>}
          </p>
          <div className="lesson-hint-chip"><span /> Alterações salvas neste navegador</div>
        </section>
        <section className="side-block">
          <div className="lesson-list-heading"><h2 className="side-title">Blocos</h2><span className="lesson-count">{slides.length}</span></div>
          <ul className="slide-list">
            {slides.map((slide, i) => {
              const parentId = parentOf(slides, i);
              const parent = slides.find((candidate) => candidate.id === parentId);
              return (
                <li key={slide.id}>
                  <button type="button" className={`slide-item${i === index ? ' is-active' : ''}`} onClick={() => { setIndex(i); setEditing(false); }}>
                    <span className="slide-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="slide-item-copy"><strong>{slide.title || 'Bloco sem título'}</strong><small>{layout !== 'linear' && parent ? `↳ ${parent.title || 'Bloco pai'}` : slide.subtitle || 'Sem descrição'}</small></span>
                    <i style={{ background: slide.accent }} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn btn-sm full lesson-add" onClick={add}><Plus size={14} aria-hidden="true" /> Adicionar bloco</button>
        </section>
        <section className="side-block lesson-utilities">
          <button type="button" className="btn btn-sm full" onClick={onOpenPatterns}><Layers size={14} aria-hidden="true" /> Aula pronta de um Design Pattern</button>
          <button type="button" className="btn btn-sm full" onClick={onExport}><Download size={14} aria-hidden="true" /> Baixar roteiro (.md)</button>
        </section>
      </aside>

      <section className="lesson-main">
        <div className="board-toolbar lesson-toolbar">
          <div className="crumb"><span>Aula</span><span aria-hidden="true">/</span><strong>{title}</strong><span className="crumb-count">bloco {index + 1} de {slides.length}</span></div>
          <div className="lesson-layout-switch" role="group" aria-label="Organização da aula">
            <button type="button" className={layout === 'linear' ? 'is-active' : ''} onClick={() => chooseLayout('linear')} aria-pressed={layout === 'linear'} title="Mostrar uma sequência"><AlignLeft size={14} aria-hidden="true" /><span>Sequência</span></button>
            <button type="button" className={layout === 'tree' ? 'is-active' : ''} onClick={() => chooseLayout('tree')} aria-pressed={layout === 'tree'} title="Raiz no topo, ramos abaixo"><GitBranch size={14} aria-hidden="true" /><span>Raiz</span></button>
            <button type="button" className={layout === 'tree-reverse' ? 'is-active' : ''} onClick={() => chooseLayout('tree-reverse')} aria-pressed={layout === 'tree-reverse'} title="Fluxo invertido da direita para a esquerda"><ArrowLeftRight size={14} aria-hidden="true" /><span>Invertida</span></button>
          </div>
          <div className="board-actions">
            <button type="button" className="btn btn-sm" onClick={() => setEditing((value) => !value)}>{editing ? <><Check size={13} aria-hidden="true" /> Ver aula</> : <><Pencil size={13} aria-hidden="true" /> Editar bloco</>}</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={startPresenting} title="Apresentar em tela cheia"><Play size={13} aria-hidden="true" /> Apresentar</button>
          </div>
        </div>
        <div className="lesson-stage">
          {editing && current ? (
            <form className="slide-form" onSubmit={(event) => event.preventDefault()}>
              <div className="slide-form-heading">
                <span className="lesson-eyebrow">BLOCO {String(index + 1).padStart(2, '0')}</span>
                <h2>Conte a próxima parte</h2>
                <p>Use um título claro e alguns detalhes para orientar quem acompanha a aula.</p>
              </div>
              <label>Título do bloco<input className="field" value={current.title} onChange={(event) => update({ title: event.target.value })} maxLength={100} /></label>
              <label>Explicação curta<textarea className="field" rows={3} value={current.subtitle} onChange={(event) => update({ subtitle: event.target.value })} /></label>
              <label>Detalhes, um por linha<textarea className="field" rows={5} value={current.bullets.join('\n')} onChange={(event) => update({ bullets: event.target.value.split('\n') })} /></label>
              {layout !== 'linear' && (
                <label>Bloco pai
                  <select className="field" value={currentParent ?? ''} onChange={(event) => update({ parentId: event.target.value || null })}>
                    <option value="">Raiz independente</option>
                    {slides.slice(0, index).map((slide, i) => <option key={slide.id} value={slide.id}>Bloco {i + 1} · {slide.title || 'Sem título'}</option>)}
                  </select>
                  <small className="field-help">Escolha de qual ideia este ramo nasce. Você também pode criar uma segunda raiz.</small>
                </label>
              )}
              <div className="prop-field"><span>Cor da caixa</span>
                <div className="swatches" role="radiogroup" aria-label="Cor da caixa">
                  {colorPalette.map((color) => (
                    <button key={color.value} type="button" role="radio" aria-checked={current.accent === color.value} aria-label={color.name} title={color.name} className={`swatch-dot${current.accent === color.value ? ' is-active' : ''}`} style={{ background: color.value }} onClick={() => update({ accent: color.value })} />
                  ))}
                </div>
              </div>
              <div className="prop-actions">
                <button type="button" className="btn btn-sm" onClick={() => move(-1)} disabled={index === 0}><ArrowUp size={13} aria-hidden="true" /> Mover para cima</button>
                <button type="button" className="btn btn-sm" onClick={() => move(1)} disabled={index >= last}><ArrowDown size={13} aria-hidden="true" /> Mover para baixo</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={remove}><Trash2 size={13} aria-hidden="true" /> Excluir este bloco</button>
              </div>
            </form>
          ) : <SketchBoard slides={slides} index={index} onIndex={setIndex} layout={layout} />}
        </div>
        <div className="lesson-controls">
          <button type="button" className="btn btn-sm" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}><ArrowLeft size={13} aria-hidden="true" /> Anterior</button>
          <div className="progress-summary"><span>PROGRESSO</span><strong>{String(index + 1).padStart(2, '0')} <i>/</i> {String(slides.length).padStart(2, '0')}</strong></div>
          <div className="progress-dots" aria-label={`Bloco ${index + 1} de ${slides.length}`}>
            {slides.map((slide, i) => (
              <button key={slide.id} type="button" className={i === index ? 'is-active' : i < index ? 'is-done' : ''} aria-label={`Ir até o bloco ${i + 1}`} title={slide.title} onClick={() => setIndex(i)} />
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={index >= slides.length - 1} onClick={() => setIndex((value) => Math.min(slides.length - 1, value + 1))}>
            {index >= slides.length - 1 ? <>Aula completa <Check size={13} aria-hidden="true" /></> : <>Revelar próximo bloco <ArrowRight size={13} aria-hidden="true" /></>}
          </button>
        </div>
      </section>

      {presenting && current && (
        <div className="presentation" role="dialog" aria-modal="true" aria-label="Apresentação da aula">
          <header className="presentation-head">
            <div className="presentation-brand">
              <div className="presentation-mark"><GitBranch size={19} aria-hidden="true" /></div>
              <div><span className="presentation-kicker">NEXOGRAPH / AULA</span><h1>{title}</h1></div>
            </div>
            <div className="presentation-tools">
              <span className="presentation-layout-label">{layout === 'linear' ? 'SEQUÊNCIA' : layout === 'tree-reverse' ? 'FLUXO INVERTIDO' : 'RAIZ · TOPO PARA BAIXO'}</span>
              <span className="presentation-count">{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
              <button type="button" className="btn btn-sm" onClick={stopPresenting}><X size={13} aria-hidden="true" /> Sair <span className="kbd">Esc</span></button>
            </div>
          </header>
          <div className="presentation-stage"><SketchBoard slides={slides} index={index} onIndex={setIndex} large layout={layout} /></div>
          <footer className="presentation-controls">
            <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}><ArrowLeft size={15} aria-hidden="true" /> Anterior</button>
            <div className="presentation-progress" role="progressbar" aria-valuemin={1} aria-valuemax={slides.length} aria-valuenow={index + 1} aria-label="Progresso da aula"><span style={{ width: `${((index + 1) / slides.length) * 100}%` }} /></div>
            <span className="presentation-step">BLOCO {String(index + 1).padStart(2, '0')}</span>
            <button type="button" className="btn btn-primary" disabled={index >= slides.length - 1} onClick={() => setIndex((value) => Math.min(slides.length - 1, value + 1))}>
              {index >= slides.length - 1 ? 'Aula completa' : 'Próximo bloco'} {index < slides.length - 1 && <ArrowRight size={15} aria-hidden="true" />}
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
