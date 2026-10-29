'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeftRight, Braces, Cable, Copy, Focus, Eraser, Layers, Maximize, Minus, Plus, Redo2, RotateCcw, Search, Trash2, Undo2, User, X } from 'lucide-react';
import { catalog, catalogFamilies, type CatalogItem } from './catalog';
import { boardFromCatalog } from './templates';
import { colorPalette, edgeLine, initialEdges, initialNodes, shapeOptions } from './types';
import type { Board } from './use-board';
import type { ShapeKind, ShapeNode } from './types';

const HINT_KEY = 'nexograph-hint-v1';
const HINT_EVENT = 'nexograph-hint-change';

function subscribeHint(callback: () => void) {
  window.addEventListener(HINT_EVENT, callback);
  return () => window.removeEventListener(HINT_EVENT, callback);
}
function readHint() {
  try { return localStorage.getItem(HINT_KEY) !== 'dismissed'; } catch { return true; }
}
const STAGE_W = 1500;
const STAGE_H = 1050;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
const labelWidth = (text: string) => Math.round(text.length * 6.9 + 16);

type Props = {
  board: Board;
  boardTitle: string;
  onTitle: (title: string) => void;
  onNotify: (message: string) => void;
  onGenerateMermaid: () => void;
};

type DragState = { id: string; sx: number; sy: number; moved: boolean; origins: Map<string, { x: number; y: number }> };
type PanState = { x: number; y: number; left: number; top: number; moved: boolean; pointerId: number };

function ShapeIcon({ kind }: { kind: ShapeKind }) {
  const option = shapeOptions.find((item) => item.kind === kind) ?? shapeOptions[0];
  return <option.Icon size={15} aria-hidden="true" />;
}

export function ManualBoard({ board, boardTitle, onTitle, onNotify, onGenerateMermaid }: Props) {
  const { nodes, edges, selectedIds, selectedEdgeId } = board;
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const editStart = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('Todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const hintOpen = useSyncExternalStore(subscribeHint, readHint, () => false);
  const dismissHint = () => {
    try { localStorage.setItem(HINT_KEY, 'dismissed'); } catch {}
    window.dispatchEvent(new Event(HINT_EVENT));
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((item) => (family === 'Todos' || item.family === family) && `${item.title} ${item.description} ${item.family}`.toLowerCase().includes(term));
  }, [family, search]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const selectedNode = selectedIds.length ? nodeById.get(selectedIds[0]) : undefined;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const nodeTitle = (id: string) => nodeById.get(id)?.title ?? '?';
  const connectedEdges = selectedNode ? edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id) : [];

  const zoomTo = (value: number, anchor?: { x: number; y: number }) => {
    const viewport = viewportRef.current;
    const next = clampZoom(value);
    if (!viewport || next === zoom) { setZoom(next); return; }
    const point = anchor ?? { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
    const worldX = (viewport.scrollLeft + point.x) / zoom;
    const worldY = (viewport.scrollTop + point.y) / zoom;
    setZoom(next);
    requestAnimationFrame(() => {
      viewport.scrollLeft = worldX * next - point.x;
      viewport.scrollTop = worldY * next - point.y;
    });
  };
  const zoomBy = (delta: number, anchor?: { x: number; y: number }) => zoomTo(zoom + delta, anchor);

  const onWindowKey = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('[aria-modal="true"]')) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if ((event.key === 'Delete' || event.key === 'Backspace') && !mod) { event.preventDefault(); board.deleteSelection(); }
    else if (event.key === 'Escape') { board.cancelConnect(); board.clearSelection(); }
    else if (mod && key === 'z') { event.preventDefault(); if (event.shiftKey) board.redo(); else board.undo(); }
    else if (mod && key === 'y') { event.preventDefault(); board.redo(); }
    else if (mod && key === 'd') { event.preventDefault(); board.duplicateSelection(); }
    else if (mod && key === 'a') { event.preventDefault(); board.selectAll(); }
    else if (mod && (key === '=' || key === '+')) { event.preventDefault(); zoomBy(0.1); }
    else if (mod && key === '-') { event.preventDefault(); zoomBy(-0.1); }
    else if (mod && key === '0') { event.preventDefault(); zoomTo(1); }
    else if (event.key.startsWith('Arrow') && board.selectedIds.length) {
      event.preventDefault();
      if (!event.repeat) board.snapshot();
      const step = event.shiftKey ? 1 : 8;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      board.nudgeSelection(dx, dy);
    }
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => onWindowKey(event);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onWheel = useEffectEvent((event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomBy(event.deltaY < 0 ? 0.1 : -0.1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const listener = (event: WheelEvent) => onWheel(event);
    viewport.addEventListener('wheel', listener, { passive: false });
    return () => viewport.removeEventListener('wheel', listener);
  }, []);

  const bounds = () => {
    if (!nodes.length) return null;
    return {
      minX: Math.min(...nodes.map((node) => node.x)),
      minY: Math.min(...nodes.map((node) => node.y)),
      maxX: Math.max(...nodes.map((node) => node.x + node.w)),
      maxY: Math.max(...nodes.map((node) => node.y + node.h)),
    };
  };

  const centerDiagram = (remember: boolean) => {
    const viewport = viewportRef.current;
    const box = bounds();
    if (!viewport || !box) return;
    const targetX = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom;
    const targetY = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
    const dx = Math.round(Math.max(40 - box.minX, targetX - (box.minX + box.maxX) / 2));
    const dy = Math.round(Math.max(40 - box.minY, targetY - (box.minY + box.maxY) / 2));
    if (dx === 0 && dy === 0) { if (remember) onNotify('O diagrama já está centralizado'); return; }
    if (remember) board.snapshot();
    board.setNodes((current) => current.map((node) => ({ ...node, x: Math.max(0, node.x + dx), y: Math.max(0, node.y + dy) })));
    if (remember) onNotify('Diagrama centralizado');
  };

  const fitView = () => {
    const viewport = viewportRef.current;
    const box = bounds();
    if (!viewport || !box) return;
    const width = box.maxX - box.minX + 120;
    const height = box.maxY - box.minY + 120;
    const next = clampZoom(Math.min(viewport.clientWidth / width, viewport.clientHeight / height, 1.25));
    setZoom(next);
    requestAnimationFrame(() => {
      viewport.scrollTo({
        left: ((box.minX + box.maxX) / 2) * next - viewport.clientWidth / 2,
        top: ((box.minY + box.maxY) / 2) * next - viewport.clientHeight / 2,
        behavior: 'smooth',
      });
    });
  };

  const onOpenCenter = useEffectEvent(() => centerDiagram(false));

  useEffect(() => {
    const frame = requestAnimationFrame(() => onOpenCenter());
    return () => cancelAnimationFrame(frame);
  }, [board.revision]);

  const startEditing = (node: ShapeNode) => { setEditingId(node.id); setEditingText(node.title); };
  const commitEditing = () => {
    if (editingId) board.renameNode(editingId, editingText.trim());
    setEditingId(null);
  };

  const onNodeDown = (event: ReactPointerEvent<HTMLDivElement>, node: ShapeNode) => {
    if (event.button !== 0 || editingId === node.id) return;
    event.stopPropagation();
    if (board.connecting) { event.preventDefault(); board.connectClick(node.id); return; }
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const group = selectedIds.includes(node.id) && !additive ? selectedIds : [node.id];
    const origins = new Map<string, { x: number; y: number }>();
    nodes.filter((item) => group.includes(item.id)).forEach((item) => origins.set(item.id, { x: item.x, y: item.y }));
    dragRef.current = { id: node.id, sx: event.clientX, sy: event.clientY, moved: false, origins };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!selectedIds.includes(node.id) || additive) board.selectNode(node.id, additive);
  };
  const onNodeMove = (event: ReactPointerEvent<HTMLDivElement>, node: ShapeNode) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== node.id) return;
    const dx = (event.clientX - drag.sx) / zoom;
    const dy = (event.clientY - drag.sy) / zoom;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      board.snapshot();
    }
    board.setNodes((current) => current.map((item) => {
      const origin = drag.origins.get(item.id);
      return origin ? { ...item, x: Math.round(Math.min(STAGE_W - 40, Math.max(0, origin.x + dx))), y: Math.round(Math.min(STAGE_H - 40, Math.max(0, origin.y + dy))) } : item;
    }));
  };
  const onNodeUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onNodeKey = (event: ReactKeyboardEvent<HTMLDivElement>, node: ShapeNode) => {
    if (event.key === 'Enter') { event.preventDefault(); startEditing(node); }
    if (event.key === ' ') { event.preventDefault(); board.selectNode(node.id, event.shiftKey); }
  };

  const isBackground = (target: EventTarget) => {
    const element = target as Element;
    return element === stageRef.current || element.classList.contains('canvas-world') || element.closest('.canvas-grid') !== null;
  };

  const onStageDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !isBackground(event.target) || (event.button !== 0 && event.button !== 1)) return;
    panRef.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, moved: false, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onStageMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const viewport = viewportRef.current;
    if (!pan || !viewport || pan.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < 4) return;
    if (!pan.moved) { pan.moved = true; setPanning(true); }
    viewport.scrollLeft = pan.left - dx;
    viewport.scrollTop = pan.top - dy;
  };
  const onStageUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panRef.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!pan.moved) {
      board.clearSelection();
      if (board.connecting && board.connectFrom) board.cancelConnect();
    }
  };
  const onStageDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !isBackground(event.target) || board.connecting) return;
    const rect = viewport.getBoundingClientRect();
    board.addShape('process', {
      x: (event.clientX - rect.left + viewport.scrollLeft) / zoom,
      y: (event.clientY - rect.top + viewport.scrollTop) / zoom,
    });
  };

  const guard = (change: () => void) => {
    if (editStart.current) { board.snapshot(); editStart.current = false; }
    change();
  };
  const onFieldFocus = () => { editStart.current = true; };

  const applyCatalog = (item: CatalogItem) => {
    board.replaceBoard(boardFromCatalog(item));
    onTitle(item.title);
    onNotify(`Modelo "${item.title}" carregado. Use Desfazer para voltar.`);
  };

  const renderNode = (node: ShapeNode) => {
    const selected = selectedIds.includes(node.id);
    const origin = board.connectFrom === node.id;
    return (
      <div
        key={node.id}
        className={`canvas-node node-${node.kind}${selected ? ' is-selected' : ''}${origin ? ' is-origin' : ''}${board.connecting ? ' is-connectable' : ''}`}
        style={{ left: node.x, top: node.y, width: node.w, height: node.h, '--node-accent': node.color } as CSSProperties}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${node.title}. Pressione Enter para editar o texto.`}
        title="Arraste para mover. Clique duas vezes para editar o texto."
        onPointerDown={(event) => onNodeDown(event, node)}
        onPointerMove={(event) => onNodeMove(event, node)}
        onPointerUp={onNodeUp}
        onPointerCancel={onNodeUp}
        onDoubleClick={(event) => { event.stopPropagation(); startEditing(node); }}
        onKeyDown={(event) => onNodeKey(event, node)}
      >
        {node.kind === 'decision' && (
          <svg className="node-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" /></svg>
        )}
        {node.kind === 'database' && <span className="node-db-cap" />}
        {node.kind === 'actor' && <User className="actor-symbol" size={14} aria-hidden="true" />}
        {editingId === node.id ? (
          <input
            autoFocus
            value={editingText}
            aria-label="Texto do elemento"
            onChange={(event) => setEditingText(event.target.value)}
            onBlur={commitEditing}
            onKeyDown={(event) => { if (event.key === 'Enter') commitEditing(); if (event.key === 'Escape') setEditingId(null); event.stopPropagation(); }}
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : <span className="node-text">{node.title}</span>}
      </div>
    );
  };

  const connectHint = board.connecting
    ? board.connectFrom ? `Agora clique no elemento de destino. Esc cancela.` : 'Clique no elemento de origem. Esc cancela.'
    : selectedIds.length === 2 ? 'Dois elementos selecionados: clique para ligar um ao outro.' : 'Clique em Conectar e depois em dois elementos, na ordem da seta.';

  return (
    <div className="board">
      <aside className="board-left" aria-label="Elementos e modelos">
        <section className="side-block">
          <h2 className="side-title">Adicionar ao quadro</h2>
          <div className="shape-grid">
            {shapeOptions.map(({ kind, label, hint, Icon }) => (
              <button key={kind} type="button" className="shape-tool" title={hint} onClick={() => board.addShape(kind)}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="side-block">
          <h2 className="side-title">Ligar elementos</h2>
          <button type="button" className={`btn connect-btn${board.connecting ? ' is-on' : ''}`} aria-pressed={board.connecting} onClick={board.toggleConnect}>
            <Cable size={15} aria-hidden="true" /> {board.connecting ? 'Conectando (Esc para sair)' : 'Conectar'}
          </button>
          <p className="side-help" aria-live="polite">{connectHint}</p>
        </section>
        <section className="side-block catalog-block">
          <h2 className="side-title">Começar de um modelo</h2>
          <label className="search-box">
            <Search size={14} aria-hidden="true" />
            <input type="search" placeholder="Buscar: classes, BPMN, Kanban…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar modelos de diagrama" />
          </label>
          <select className="field" aria-label="Filtrar por família" value={family} onChange={(event) => setFamily(event.target.value)}>
            <option>Todos</option>
            {catalogFamilies.map((name) => <option key={name}>{name}</option>)}
          </select>
          <ul className="catalog-list">
            {filtered.map((item) => (
              <li key={`${item.family}-${item.title}`}>
                <button type="button" className="catalog-item" onClick={() => applyCatalog(item)}>
                  <strong>{item.title}</strong>
                  <small>{item.family}. {item.description}</small>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="catalog-empty">Nenhum modelo com esse nome. Tente outra palavra.</li>}
          </ul>
        </section>
      </aside>

      <main className="board-main">
        {hintOpen && (
          <div className="hint-strip" role="note">
            <strong>Primeira vez aqui?</strong>
            <ol>
              <li>Escolha uma forma à esquerda.</li>
              <li>Arraste para mover. Dois cliques editam o texto.</li>
              <li>Use <b>Conectar</b> para ligar duas formas.</li>
            </ol>
            <button type="button" className="btn btn-sm" onClick={dismissHint}>Entendi</button>
          </div>
        )}
        <div className="board-toolbar">
          <div className="crumb"><span>Quadro</span><span aria-hidden="true">/</span><strong>{boardTitle}</strong></div>
          <div className="board-actions">
            <div className="btn-group" role="group" aria-label="Histórico">
              <button type="button" className="btn btn-sm" onClick={board.undo} disabled={!board.canUndo} title="Desfazer (Ctrl+Z)"><Undo2 size={13} aria-hidden="true" /> <span className="btn-label">Desfazer</span></button>
              <button type="button" className="btn btn-sm" onClick={board.redo} disabled={!board.canRedo} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 size={13} aria-hidden="true" /></button>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => centerDiagram(true)} disabled={!nodes.length} title="Colocar o diagrama no meio da tela"><Focus size={13} aria-hidden="true" /> Centralizar</button>
            <button type="button" className="btn btn-sm" onClick={board.duplicateSelection} disabled={!selectedIds.length} title="Duplicar (Ctrl+D)"><Copy size={13} aria-hidden="true" /> Duplicar</button>
            <button type="button" className="btn btn-sm" onClick={() => { board.replaceBoard({ nodes: [], edges: [] }); onTitle('Quadro em branco'); onNotify('Quadro limpo. Use Desfazer para voltar.'); }} title="Apagar tudo"><Eraser size={13} aria-hidden="true" /> Limpar</button>
            <button type="button" className="btn btn-sm" onClick={() => { board.replaceBoard({ nodes: initialNodes, edges: initialEdges }); onTitle('Arquitetura de aplicação'); onNotify('Exemplo restaurado'); }} title="Voltar ao exemplo inicial"><RotateCcw size={13} aria-hidden="true" /> Exemplo</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={onGenerateMermaid} title="Transformar este quadro em código Mermaid"><Braces size={13} aria-hidden="true" /> Gerar código Mermaid</button>
          </div>
        </div>
        <div className="canvas-wrap">
          <div ref={viewportRef} className={`canvas-viewport${board.connecting ? ' is-connecting' : ''}${panning ? ' is-panning' : ''}`}>
            <div
              className="canvas-stage"
              ref={stageRef}
              style={{ width: STAGE_W * zoom, height: STAGE_H * zoom }}
              onPointerDown={onStageDown}
              onPointerMove={onStageMove}
              onPointerUp={onStageUp}
              onPointerCancel={onStageUp}
              onDoubleClick={onStageDoubleClick}
            >
              <div className="canvas-world" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${zoom})` }}>
                <svg className="canvas-grid" width="100%" height="100%" aria-hidden="true">
                  <defs>
                    <pattern id="grid-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" /></pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-dots)" />
                </svg>
                <svg className="connections-layer" width={STAGE_W} height={STAGE_H} aria-label="Setas do diagrama">
                  <defs>
                    <marker id="arrow-edge" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="11" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" className="arrow-fill" /></marker>
                    <marker id="arrow-edge-sel" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="11" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" className="arrow-fill-sel" /></marker>
                  </defs>
                  {edges.map((edge) => {
                    const from = nodeById.get(edge.from);
                    const to = nodeById.get(edge.to);
                    if (!from || !to) return null;
                    const { x1, y1, x2, y2 } = edgeLine(from, to);
                    const isSelected = edge.id === selectedEdgeId;
                    const label = edge.label?.trim();
                    const width = label ? labelWidth(label) : 0;
                    const lift = Math.hypot(x2 - x1, y2 - y1) < width + 24 && Math.abs(y2 - y1) < Math.abs(x2 - x1) ? 20 : 0;
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2 - lift;
                    return (
                      <g key={edge.id} className={`edge${isSelected ? ' is-selected' : ''}`} onPointerDown={(event) => { event.stopPropagation(); board.selectEdge(edge.id); }}>
                        <line className="edge-hit" x1={x1} y1={y1} x2={x2} y2={y2} />
                        <line className="edge-line" x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={isSelected ? 'url(#arrow-edge-sel)' : 'url(#arrow-edge)'} />
                        {label && (
                          <g className="edge-tag">
                            <rect x={mx - width / 2} y={my - 11} width={width} height={22} rx={11} />
                            <text x={mx} y={my + 4} textAnchor="middle">{label}</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
                {nodes.map(renderNode)}
              </div>
            </div>
          </div>
          {nodes.length === 0 && (
            <div className="empty-canvas">
              <span className="empty-icon" aria-hidden="true"><Plus size={22} /></span>
              <h2>Seu quadro está vazio</h2>
              <p>Escolha uma forma na barra à esquerda, dê dois cliques em qualquer ponto da folha ou comece de um modelo da biblioteca.</p>
              <button type="button" className="btn btn-primary" onClick={() => board.addShape('process')}><Plus size={15} aria-hidden="true" /> Adicionar a primeira caixa</button>
            </div>
          )}
          <div className="canvas-zoom" role="group" aria-label="Zoom do quadro">
            <button type="button" className="icon-btn" onClick={() => zoomBy(-0.1)} disabled={zoom <= MIN_ZOOM} aria-label="Diminuir zoom" title="Diminuir zoom (Ctrl + -)"><Minus size={14} aria-hidden="true" /></button>
            <button type="button" className="canvas-zoom-value" onClick={() => zoomTo(1)} title="Voltar para 100% (Ctrl + 0)">{Math.round(zoom * 100)}%</button>
            <button type="button" className="icon-btn" onClick={() => zoomBy(0.1)} disabled={zoom >= MAX_ZOOM} aria-label="Aumentar zoom" title="Aumentar zoom (Ctrl + +)"><Plus size={14} aria-hidden="true" /></button>
            <span className="canvas-zoom-sep" aria-hidden="true" />
            <button type="button" className="icon-btn" onClick={fitView} disabled={!nodes.length} aria-label="Ajustar o diagrama à tela" title="Ajustar à tela"><Maximize size={14} aria-hidden="true" /></button>
          </div>
        </div>
      </main>

      <aside className="board-right" aria-label="Propriedades">
        <section className="side-block">
          <h2 className="side-title">Propriedades</h2>
          {selectedEdge ? (
            <div className="props">
              <p className="props-sub">Seta de <strong>{nodeTitle(selectedEdge.from)}</strong> para <strong>{nodeTitle(selectedEdge.to)}</strong></p>
              <label className="prop-field"><span>Texto sobre a seta</span>
                <input className="field" value={selectedEdge.label ?? ''} placeholder="Ex.: envia pedido" onFocus={onFieldFocus} onChange={(event) => guard(() => board.updateEdge(selectedEdge.id, { label: event.target.value }))} />
              </label>
              <div className="prop-actions">
                <button type="button" className="btn btn-sm" onClick={() => board.reverseEdge(selectedEdge.id)}><ArrowLeftRight size={13} aria-hidden="true" /> Inverter sentido</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={board.deleteSelection}><Trash2 size={13} aria-hidden="true" /> Remover seta</button>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="props">
              <label className="prop-field"><span>Texto</span>
                <input className="field" value={selectedNode.title} onFocus={onFieldFocus} onChange={(event) => guard(() => board.updateSelected({ title: event.target.value }))} />
              </label>
              <label className="prop-field"><span>Forma</span>
                <select className="field" value={selectedNode.kind} onChange={(event) => { board.snapshot(); board.updateSelected({ kind: event.target.value as ShapeKind }); }}>
                  {shapeOptions.map((shape) => <option value={shape.kind} key={shape.kind}>{shape.label}</option>)}
                </select>
              </label>
              <div className="prop-row">
                <label className="prop-field"><span>Largura</span>
                  <input className="field mono" type="number" min={90} max={420} value={selectedNode.w} onFocus={onFieldFocus} onChange={(event) => guard(() => board.updateSelected({ w: Math.max(90, Number(event.target.value)) }))} />
                </label>
                <label className="prop-field"><span>Altura</span>
                  <input className="field mono" type="number" min={55} max={260} value={selectedNode.h} onFocus={onFieldFocus} onChange={(event) => guard(() => board.updateSelected({ h: Math.max(55, Number(event.target.value)) }))} />
                </label>
              </div>
              <div className="prop-field"><span>Cor</span>
                <div className="swatches" role="radiogroup" aria-label="Cor do elemento">
                  {colorPalette.map((color) => (
                    <button key={color.value} type="button" role="radio" aria-checked={selectedNode.color === color.value} aria-label={color.name} title={color.name} className={`swatch-dot${selectedNode.color === color.value ? ' is-active' : ''}`} style={{ background: color.value }} onClick={() => { board.snapshot(); board.updateSelected({ color: color.value }); }} />
                  ))}
                </div>
              </div>
              {connectedEdges.length > 0 && (
                <div className="prop-field"><span>Setas deste elemento</span>
                  <ul className="edge-list">
                    {connectedEdges.map((edge) => (
                      <li key={edge.id}>
                        <button type="button" onClick={() => board.selectEdge(edge.id)}>
                          {edge.from === selectedNode.id ? 'para' : 'de'} <strong>{nodeTitle(edge.from === selectedNode.id ? edge.to : edge.from)}</strong>{edge.label ? <em>{edge.label}</em> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="prop-actions">
                <button type="button" className="btn btn-sm" onClick={board.duplicateSelection}><Copy size={13} aria-hidden="true" /> Duplicar</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={board.deleteSelection}><Trash2 size={13} aria-hidden="true" /> Remover</button>
              </div>
            </div>
          ) : (
            <div className="props-empty">
              <p className="side-help">Clique em um elemento ou em uma seta para mudar texto, forma, tamanho e cor.</p>
              <ul className="shortcut-list">
                <li><span>Remover</span><span><span className="kbd">Delete</span></span></li>
                <li><span>Desfazer</span><span><span className="kbd">Ctrl</span> <span className="kbd">Z</span></span></li>
                <li><span>Refazer</span><span><span className="kbd">Ctrl</span> <span className="kbd">Shift</span> <span className="kbd">Z</span></span></li>
                <li><span>Selecionar tudo</span><span><span className="kbd">Ctrl</span> <span className="kbd">A</span></span></li>
                <li><span>Zoom</span><span><span className="kbd">Ctrl</span> + roda do mouse</span></li>
              </ul>
            </div>
          )}
        </section>
        <section className="side-block layers">
          <h2 className="side-title"><Layers size={13} aria-hidden="true" /> Elementos ({nodes.length})</h2>
          <ul>
            {nodes.slice().reverse().map((node) => (
              <li key={node.id}>
                <button type="button" className={selectedIds.includes(node.id) ? 'is-active' : ''} onClick={() => board.selectNode(node.id, false)}>
                  <ShapeIcon kind={node.kind} /><span>{node.title}</span><i style={{ background: node.color }} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
        {(selectedIds.length > 0 || selectedEdgeId) && (
          <button type="button" className="clear-selection" onClick={board.clearSelection}><X size={12} aria-hidden="true" /> Limpar seleção</button>
        )}
      </aside>
    </div>
  );
}
