'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeftRight, Braces, Cable, Copy, Focus, Eraser, Layers, Plus, RotateCcw, Search, Trash2, Undo2, User, X } from 'lucide-react';
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

type Props = {
  board: Board;
  boardTitle: string;
  onTitle: (title: string) => void;
  onNotify: (message: string) => void;
  onGenerateMermaid: () => void;
  /** Fica verdadeiro quando o que estava salvo já foi carregado. */
  ready: boolean;
};

type DragState = { id: string; sx: number; sy: number; moved: boolean; origins: Map<string, { x: number; y: number }> };

function ShapeIcon({ kind }: { kind: ShapeKind }) {
  const option = shapeOptions.find((item) => item.kind === kind) ?? shapeOptions[0];
  return <option.Icon size={15} aria-hidden="true" />;
}

export function ManualBoard({ board, boardTitle, onTitle, onNotify, onGenerateMermaid, ready }: Props) {
  const { nodes, edges, selectedIds, selectedEdgeId } = board;
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const editStart = useRef(false);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('Todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const hintOpen = useSyncExternalStore(subscribeHint, readHint, () => false);
  const dismissHint = () => {
    try { localStorage.setItem(HINT_KEY, 'dismissed'); } catch { /* sem armazenamento */ }
    window.dispatchEvent(new Event(HINT_EVENT));
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter((item) => (family === 'Todos' || item.family === family) && `${item.title} ${item.description} ${item.family}`.toLowerCase().includes(term));
  }, [family, search]);

  const selectedNode = nodes.find((node) => node.id === selectedIds[0]);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const nodeTitle = (id: string) => nodes.find((node) => node.id === id)?.title ?? '?';
  const connectedEdges = selectedNode ? edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id) : [];

  // Atalhos de teclado do quadro.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = event.ctrlKey || event.metaKey;
      if ((event.key === 'Delete' || event.key === 'Backspace') && !mod) { event.preventDefault(); board.deleteSelection(); }
      else if (event.key === 'Escape') { board.cancelConnect(); board.clearSelection(); }
      else if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); board.undo(); }
      else if (mod && event.key.toLowerCase() === 'd') { event.preventDefault(); board.duplicateSelection(); }
      else if (event.key.startsWith('Arrow') && board.selectedIds.length) {
        event.preventDefault();
        const step = event.shiftKey ? 1 : 8;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        board.setNodes((current) => current.map((node) => (board.selectedIds.includes(node.id) ? { ...node, x: Math.max(0, node.x + dx), y: Math.max(0, node.y + dy) } : node)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** Move o diagrama inteiro para o meio da área visível do quadro. */
  const centerDiagram = (remember: boolean) => {
    const viewport = viewportRef.current;
    if (!viewport || !board.nodes.length) return;
    const minX = Math.min(...board.nodes.map((node) => node.x));
    const minY = Math.min(...board.nodes.map((node) => node.y));
    const maxX = Math.max(...board.nodes.map((node) => node.x + node.w));
    const maxY = Math.max(...board.nodes.map((node) => node.y + node.h));
    const targetX = viewport.scrollLeft + viewport.clientWidth / 2;
    const targetY = viewport.scrollTop + viewport.clientHeight / 2;
    // Se o diagrama for maior que a janela, alinha com uma margem em vez de cortar o começo.
    const dx = Math.round(Math.max(40 - minX, targetX - (minX + maxX) / 2));
    const dy = Math.round(Math.max(40 - minY, targetY - (minY + maxY) / 2));
    if (dx === 0 && dy === 0) { if (remember) onNotify('O diagrama já está centralizado'); return; }
    if (remember) board.snapshot();
    board.setNodes((current) => current.map((node) => ({ ...node, x: Math.max(0, node.x + dx), y: Math.max(0, node.y + dy) })));
    if (remember) onNotify('Diagrama centralizado');
  };
  const centerRef = useRef(centerDiagram);
  useEffect(() => { centerRef.current = centerDiagram; });

  // Centraliza quando o quadro abre, depois que o salvo é carregado e quando um modelo troca o quadro.
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => centerRef.current(false));
    return () => cancelAnimationFrame(frame);
  }, [ready, board.revision]);

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
    const dx = event.clientX - drag.sx;
    const dy = event.clientY - drag.sy;
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
        onDoubleClick={() => startEditing(node)}
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
            <button type="button" className="btn btn-sm" onClick={board.undo} disabled={!board.canUndo} title="Desfazer (Ctrl+Z)"><Undo2 size={13} aria-hidden="true" /> Desfazer</button>
            <button type="button" className="btn btn-sm" onClick={() => centerDiagram(true)} disabled={!nodes.length} title="Colocar o diagrama no meio da tela"><Focus size={13} aria-hidden="true" /> Centralizar</button>
            <button type="button" className="btn btn-sm" onClick={board.duplicateSelection} disabled={!selectedIds.length} title="Duplicar (Ctrl+D)"><Copy size={13} aria-hidden="true" /> Duplicar</button>
            <button type="button" className="btn btn-sm" onClick={() => { board.replaceBoard({ nodes: [], edges: [] }); onTitle('Quadro em branco'); onNotify('Quadro limpo. Use Desfazer para voltar.'); }} title="Apagar tudo"><Eraser size={13} aria-hidden="true" /> Limpar</button>
            <button type="button" className="btn btn-sm" onClick={() => { board.replaceBoard({ nodes: initialNodes, edges: initialEdges }); onTitle('Arquitetura de aplicação'); onNotify('Exemplo restaurado'); }} title="Voltar ao exemplo inicial"><RotateCcw size={13} aria-hidden="true" /> Exemplo</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={onGenerateMermaid} title="Transformar este quadro em código Mermaid"><Braces size={13} aria-hidden="true" /> Gerar código Mermaid</button>
          </div>
        </div>
        <div ref={viewportRef} className={`canvas-viewport${board.connecting ? ' is-connecting' : ''}`}>
          <div className="canvas-stage" ref={stageRef} onPointerDown={(event) => { if (event.target === event.currentTarget || (event.target as Element).tagName === 'svg') { board.clearSelection(); if (board.connecting && board.connectFrom) board.cancelConnect(); } }}>
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
                const from = nodes.find((node) => node.id === edge.from);
                const to = nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const { x1, y1, x2, y2 } = edgeLine(from, to);
                const isSelected = edge.id === selectedEdgeId;
                return (
                  <g key={edge.id} className={`edge${isSelected ? ' is-selected' : ''}`} onPointerDown={(event) => { event.stopPropagation(); board.setSelectedIds([]); board.setSelectedEdgeId(edge.id); }}>
                    <line className="edge-hit" x1={x1} y1={y1} x2={x2} y2={y2} />
                    <line className="edge-line" x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={isSelected ? 'url(#arrow-edge-sel)' : 'url(#arrow-edge)'} />
                    {edge.label && <text className="edge-label" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 9} textAnchor="middle">{edge.label}</text>}
                  </g>
                );
              })}
            </svg>
            {nodes.map(renderNode)}
            {nodes.length === 0 && (
              <div className="empty-canvas">
                <h2>Seu quadro está vazio</h2>
                <p>Escolha uma forma na barra à esquerda ou comece de um modelo da biblioteca.</p>
                <button type="button" className="btn btn-primary" onClick={() => board.addShape('process')}><Plus size={15} aria-hidden="true" /> Adicionar a primeira caixa</button>
              </div>
            )}
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
                        <button type="button" onClick={() => { board.setSelectedIds([]); board.setSelectedEdgeId(edge.id); }}>
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
            <p className="side-help">Clique em um elemento ou em uma seta para mudar texto, forma, tamanho e cor. <span className="kbd">Delete</span> remove e <span className="kbd">Ctrl</span> + <span className="kbd">Z</span> desfaz.</p>
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
