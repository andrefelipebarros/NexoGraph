'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowRight, Focus, Minus, Plus } from 'lucide-react';
import { curvedArrow, hatch, roughRect, seedFrom } from '@/lib/sketch';
import type { LessonLayout, Slide } from '@/app/studio/types';

const BOX_W = 300;
const BOX_H = 104;
const COLUMN = 470;
const ROW_SHIFT = 120;
const TREE_ROW = 360;
const ROOT_DEPTH_GAP = 470;
const ROOT_CONNECTOR_OFFSET = 300;

type Props = {
  slides: Slide[];
  index: number;
  onIndex: (index: number) => void;
  /** Modo apresentação: letras maiores e setas de navegação sobre a folha. */
  large?: boolean;
  layout?: LessonLayout;
  /** Mostra o desenho inteiro, parado e sem controles. Usado na prévia da página inicial. */
  overview?: boolean;
};
type Pan = { index: number; x: number; y: number };
type Position = { x: number; y: number; parentId: string | null; depth: number };
type Point = { x: number; y: number };

function parentOf(slides: Slide[], i: number): string | null {
  const slide = slides[i];
  if (!slide) return null;
  if (Object.prototype.hasOwnProperty.call(slide, 'parentId')) return slide.parentId ?? null;
  return i > 0 ? slides[i - 1].id : null;
}

/** Mantém a sequência original e posiciona a aula em níveis, com a raiz no topo. */
function layoutSlides(slides: Slide[], layout: LessonLayout): Position[] {
  if (layout === 'linear') {
    return slides.map((slide, i) => ({ ...place(i), parentId: i > 0 ? slides[i - 1].id : null, depth: i }));
  }

  const byId = new Map(slides.map((slide, i) => [slide.id, i]));
  const parents = slides.map((_, i) => {
    const parentId = parentOf(slides, i);
    const parentIndex = parentId ? byId.get(parentId) : undefined;
    // Uma ligação para si próprio ou para um bloco posterior não entra na hierarquia.
    return parentIndex !== undefined && parentIndex < i ? parentId : null;
  });
  const children = new Map<string, string[]>();
  slides.forEach((slide, i) => {
    const parentId = parents[i];
    if (!parentId) return;
    const list = children.get(parentId) ?? [];
    list.push(slide.id);
    children.set(parentId, list);
  });

  const positions = new Map<string, Position>();
  let leafCursor = 0;
  let maxDepth = 0;

  // "Raiz": cada nível desce; subárvores ocupam colunas e o pai fica centrado sobre os filhos.
  if (layout === 'tree') {
    const placeDown = (id: string, depth: number): number => {
      maxDepth = Math.max(maxDepth, depth);
      const descendants = children.get(id) ?? [];
      let centerX: number;
      if (!descendants.length) {
        centerX = leafCursor * TREE_ROW + BOX_W / 2;
        leafCursor += 1;
      } else {
        const childCenters = descendants.map((childId) => placeDown(childId, depth + 1));
        centerX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
      }
      const index = byId.get(id)!;
      positions.set(id, {
        x: centerX - BOX_W / 2,
        y: depth * ROOT_DEPTH_GAP,
        parentId: parents[index],
        depth,
      });
      return centerX;
    };

    slides.forEach((slide, i) => { if (!parents[i]) placeDown(slide.id, 0); });
    return slides.map((slide) => positions.get(slide.id) ?? { x: 0, y: 0, parentId: null, depth: 0 });
  }

  // "Invertida": preserva a organização lateral, mas faz a hierarquia caminhar da direita para a esquerda.
  let leafY = 0;
  const placeAcross = (id: string, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const descendants = children.get(id) ?? [];
    let y: number;
    if (!descendants.length) {
      y = leafY * TREE_ROW;
      leafY += 1;
    } else {
      const childYs = descendants.map((childId) => placeAcross(childId, depth + 1));
      y = (childYs[0] + childYs[childYs.length - 1]) / 2;
    }
    const index = byId.get(id)!;
    positions.set(id, { x: depth * COLUMN, y, parentId: parents[index], depth });
    return y;
  };
  slides.forEach((slide, i) => { if (!parents[i]) placeAcross(slide.id, 0); });
  return slides.map((slide) => {
    const position = positions.get(slide.id) ?? { x: 0, y: 0, parentId: null, depth: 0 };
    return { ...position, x: (maxDepth - position.depth) * COLUMN };
  });
}

/** Posição da trilha antiga: zigue-zague, como um rascunho feito na folha. */
function place(i: number) {
  return { x: i * COLUMN, y: i % 2 === 0 ? 0 : ROW_SHIFT };
}

/** A aula desenhada à mão, em sequência ou como uma árvore de ideias com raízes e ramos. */
export function SketchBoard({ slides, index, onIndex, large = false, layout = 'linear', overview = false }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [pan, setPan] = useState<Pan>({ index: 0, x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setSize({ w: node.clientWidth, h: node.clientHeight }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const offset = overview ? { index, x: 0, y: 0 } : pan.index === index ? pan : { index, x: 0, y: 0 };
  const visibleSlides = slides.slice(0, Math.min(index + 1, slides.length));
  const positions = useMemo(() => layoutSlides(visibleSlides, layout), [visibleSlides, layout]);
  const positionById = useMemo(() => new Map(positions.map((position, i) => [visibleSlides[i].id, position] as const)), [positions, visibleSlides]);
  const current = positions[Math.min(index, positions.length - 1)] ?? { x: 0, y: 0, parentId: null, depth: 0 };
  const parentPosition = current.parentId ? positionById.get(current.parentId) : undefined;
  const previous = parentPosition ?? current;
  const pairWidth = Math.abs(current.x - previous.x) + BOX_W + 80;
  const pairHeight = Math.abs(current.y - previous.y) + 380;
  const fit = Math.min(large ? 1.22 : 1.02, (size.w - 52) / Math.max(BOX_W + 70, pairWidth), (size.h - 76) / Math.max(390, pairHeight));
  const NOTE_H = 260;
  const left = Math.min(...positions.map((position) => position.x), 0);
  const top = Math.min(...positions.map((position) => position.y), 0);
  const right = Math.max(...positions.map((position) => position.x + BOX_W), BOX_W);
  const bottom = Math.max(...positions.map((position) => position.y + BOX_H + NOTE_H), BOX_H + NOTE_H);
  const overviewScale = Math.min((size.w - 24) / (right - left + 40), (size.h - 24) / (bottom - top + 40));
  const scale = overview ? Math.max(0.2, overviewScale) : Math.max(layout === 'linear' ? 0.4 : 0.3, fit) * zoom;
  const centerX = overview ? (left + right) / 2 : (current.x + previous.x) / 2 + BOX_W / 2;
  const centerY = overview
    ? (top + bottom) / 2
    : layout === 'linear'
      ? Math.min(current.y, previous.y) + 190
      : (current.y + previous.y) / 2 + 190;
  const tx = size.w / 2 - centerX * scale + offset.x;
  const ty = size.h / 2 - centerY * scale + offset.y;

  const shapes = useMemo(() => visibleSlides.map((slide, i) => {
    const seed = seedFrom(slide.id);
    const [outlineA, outlineB] = roughRect(BOX_W, BOX_H, seed);
    return { slide, i, seed, outlineA, outlineB, hatch: hatch(BOX_W, BOX_H, seed) };
  }), [visibleSlides]);

  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (overview || event.button !== 0) return;
    dragRef.current = { sx: event.clientX, sy: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPan({ index, x: drag.ox + event.clientX - drag.sx, y: drag.oy + event.clientY - drag.sy });
  };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const stepZoom = (delta: number) => setZoom((value) => Math.min(1.8, Math.max(0.4, Math.round((value + delta) * 10) / 10)));

  return (
    <div className={`sketch${large ? ' is-large' : ''}${overview ? ' is-overview' : ''}${layout !== 'linear' ? ' is-tree' : ''}${layout === 'tree' ? ' is-root-tree' : ''}`}>
      <div
        ref={viewportRef}
        className={`sketch-viewport${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="img"
        aria-label={`Diagrama da aula, bloco ${index + 1} de ${slides.length}: ${slides[index]?.title ?? ''}`}
      >
        <div className={`sketch-world${dragging ? ' no-ease' : ''}`} style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
          {shapes.map(({ slide, i, seed, outlineA, outlineB, hatch: lines }) => {
            const at: Position = positions[i] ?? { ...place(i), parentId: null, depth: i };
            const parentId = layout === 'linear' ? (i > 0 ? visibleSlides[i - 1].id : null) : at.parentId;
            const parentAt = parentId ? positionById.get(parentId) : undefined;
            const root = layout !== 'linear' && !parentId;
            let arrow: { line: string; head: string; bounds: { left: number; top: number; width: number; height: number } } | null = null;
            if (parentAt) {
              const start: Point = layout === 'tree'
                ? { x: parentAt.x + BOX_W / 2, y: parentAt.y + ROOT_CONNECTOR_OFFSET }
                : layout === 'tree-reverse'
                  ? { x: parentAt.x - 8, y: parentAt.y + BOX_H / 2 }
                  : { x: parentAt.x + BOX_W + 6, y: parentAt.y + BOX_H / 2 };
              const end: Point = layout === 'tree'
                ? { x: at.x + BOX_W / 2, y: at.y - 12 }
                : layout === 'tree-reverse'
                  ? { x: at.x + BOX_W + 8, y: at.y + BOX_H / 2 }
                  : { x: at.x - 8, y: at.y + BOX_H / 2 };
              const bounds = {
                left: Math.min(start.x, end.x) - 36,
                top: Math.min(start.y, end.y) - 42,
                width: Math.abs(end.x - start.x) + 72,
                height: Math.abs(end.y - start.y) + 84,
              };
              arrow = { ...curvedArrow(start, end, seed), bounds };
            }
            const titleSize = slide.title.length > 26 ? 24 : slide.title.length > 16 ? 29 : 34;
            const noteTilt = i % 2 === 0 ? -1.6 : 1.4;
            return (
              <div key={slide.id} className={`sketch-step${i === index ? ' is-current' : ''}`} style={{ '--step-accent': slide.accent } as CSSProperties}>
                {arrow && (
                  <svg className="sketch-arrow" style={{ left: arrow.bounds.left, top: arrow.bounds.top }} width={arrow.bounds.width} height={arrow.bounds.height} viewBox={`${arrow.bounds.left} ${arrow.bounds.top} ${arrow.bounds.width} ${arrow.bounds.height}`} aria-hidden="true">
                    <path d={arrow.line} pathLength={1} className="sk-stroke sk-draw" />
                    <path d={arrow.head} className="sk-stroke sk-head" />
                  </svg>
                )}
                <div className="sketch-card" style={{ left: at.x, top: at.y, width: BOX_W }}>
                  <div className="sketch-box" style={{ height: BOX_H }}>
                    <svg width={BOX_W + 12} height={BOX_H + 12} viewBox={`-6 -6 ${BOX_W + 12} ${BOX_H + 12}`} aria-hidden="true">
                      <clipPath id={`clip-${slide.id}`}><rect x="2" y="2" width={BOX_W - 4} height={BOX_H - 4} /></clipPath>
                      <path d={lines} className="sk-hatch" clipPath={`url(#clip-${slide.id})`} />
                      <path d={outlineA} className="sk-box-line" />
                      <path d={outlineB} className="sk-box-line is-second" />
                    </svg>
                    <h2 style={{ fontSize: titleSize }}>{slide.title || 'Bloco sem título'}</h2>
                    <span className="sketch-num">{i + 1}</span>
                    {root && <span className="sketch-root-label">RAIZ</span>}
                  </div>
                  <div className="sketch-note" style={{ transform: `rotate(${noteTilt}deg)` }}>
                    {slide.subtitle && <p className="sketch-sub">{slide.subtitle}</p>}
                    <ul>{slide.bullets.filter((bullet) => bullet.trim()).map((bullet, b) => <li key={`${slide.id}-${b}`}>{bullet}</li>)}</ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!overview && <p className="sketch-tip">{layout === 'linear' ? 'Arraste a folha para ver outras partes' : layout === 'tree' ? 'A raiz começa no topo; arraste para explorar os ramos abaixo' : 'Arraste para explorar o fluxo invertido'}</p>}
      </div>

      {!overview && <div className="sketch-tools" role="group" aria-label="Zoom">
        <button type="button" className="sketch-tool" aria-label="Afastar" onClick={() => stepZoom(-0.1)}><Minus size={16} aria-hidden="true" /></button>
        <button type="button" className="sketch-tool" aria-label="Aproximar" onClick={() => stepZoom(0.1)}><Plus size={16} aria-hidden="true" /></button>
        <button type="button" className="sketch-tool" aria-label="Voltar ao bloco atual" title="Voltar ao bloco atual" onClick={() => { setPan({ index, x: 0, y: 0 }); setZoom(1); }}><Focus size={16} aria-hidden="true" /></button>
      </div>}

      {large && (
        <nav className="sketch-nav" aria-label="Navegar pela aula">
          <button type="button" aria-label="Bloco anterior" disabled={index === 0} onClick={() => onIndex(Math.max(0, index - 1))}><ArrowLeft size={22} aria-hidden="true" /></button>
          <span className="sketch-dots">
            {slides.map((slide, i) => <button key={slide.id} type="button" className={i === index ? 'is-active' : i < index ? 'is-done' : ''} aria-label={`Ir ao bloco ${i + 1}`} title={slide.title} onClick={() => onIndex(i)} />)}
          </span>
          <button type="button" aria-label="Próximo bloco" disabled={index >= slides.length - 1} onClick={() => onIndex(Math.min(slides.length - 1, index + 1))}><ArrowRight size={22} aria-hidden="true" /></button>
        </nav>
      )}
    </div>
  );
}
