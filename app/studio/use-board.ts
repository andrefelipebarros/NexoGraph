'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createId, initialEdges, initialNodes, paletteValues, shapeOptions } from './types';
import type { Edge, ShapeKind, ShapeNode } from './types';

type Snapshot = { nodes: ShapeNode[]; edges: Edge[] };

const HISTORY_LIMIT = 80;

const shapeTitles: Record<ShapeKind, string> = {
  process: 'Novo elemento',
  decision: 'Decisão?',
  database: 'Banco de dados',
  note: 'Escreva uma nota',
  actor: 'Pessoa',
  terminator: 'Início ou fim',
};

export function useBoard(notify: (message: string) => void, initial?: Partial<Snapshot>) {
  const [nodes, setNodes] = useState<ShapeNode[]>(() => initial?.nodes ?? initialNodes);
  const [edges, setEdges] = useState<Edge[]>(() => initial?.edges ?? initialEdges);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  const [revision, setRevision] = useState(0);
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const latest = useRef<Snapshot>({ nodes, edges });

  useEffect(() => { latest.current = { nodes, edges }; }, [nodes, edges]);

  const syncHistory = useCallback(() => {
    setHistorySize({ undo: past.current.length, redo: future.current.length });
  }, []);

  const snapshot = useCallback(() => {
    past.current.push({ nodes: latest.current.nodes, edges: latest.current.edges });
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    syncHistory();
  }, [syncHistory]);

  const restore = useCallback((target: Snapshot) => {
    setNodes(target.nodes);
    setEdges(target.edges);
    setSelectedIds((current) => current.filter((id) => target.nodes.some((node) => node.id === id)));
    setSelectedEdgeId(null);
  }, []);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) { notify('Não há nada para desfazer'); return; }
    future.current.push({ nodes: latest.current.nodes, edges: latest.current.edges });
    restore(previous);
    syncHistory();
    notify('Ação desfeita');
  }, [notify, restore, syncHistory]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) { notify('Não há nada para refazer'); return; }
    past.current.push({ nodes: latest.current.nodes, edges: latest.current.edges });
    restore(next);
    syncHistory();
    notify('Ação refeita');
  }, [notify, restore, syncHistory]);

  const selectNode = useCallback((id: string, additive: boolean) => {
    setSelectedEdgeId(null);
    setSelectedIds((current) => (additive ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id]));
  }, []);

  const selectEdge = useCallback((id: string) => {
    setSelectedIds([]);
    setSelectedEdgeId(id);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedEdgeId(null);
    setSelectedIds(latest.current.nodes.map((node) => node.id));
  }, []);

  const clearSelection = useCallback(() => { setSelectedIds([]); setSelectedEdgeId(null); }, []);

  const addShape = useCallback((kind: ShapeKind = 'process', position?: { x: number; y: number }) => {
    snapshot();
    const label = shapeOptions.find((shape) => shape.kind === kind)?.label || 'Forma';
    const count = latest.current.nodes.length;
    const w = kind === 'note' ? 185 : 165;
    const h = kind === 'note' ? 100 : kind === 'actor' ? 92 : 76;
    const node: ShapeNode = {
      id: createId('node'),
      title: shapeTitles[kind],
      kind,
      x: position ? Math.max(0, Math.round(position.x - w / 2)) : 130 + (count % 5) * 42,
      y: position ? Math.max(0, Math.round(position.y - h / 2)) : 110 + (count % 6) * 39,
      w,
      h,
      color: paletteValues[count % paletteValues.length],
    };
    setNodes((current) => [...current, node]);
    setSelectedIds([node.id]);
    setSelectedEdgeId(null);
    notify(`${label} adicionada ao quadro`);
  }, [notify, snapshot]);

  const replaceBoard = useCallback((next: Snapshot) => {
    snapshot();
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedIds([]);
    setSelectedEdgeId(null);
    setConnecting(false);
    setConnectFrom(null);
    setRevision((value) => value + 1);
  }, [snapshot]);

  const updateSelected = useCallback((patch: Partial<ShapeNode>) => {
    setNodes((current) => current.map((node) => (selectedIds.includes(node.id) ? { ...node, ...patch } : node)));
  }, [selectedIds]);

  const renameNode = useCallback((id: string, title: string) => {
    const before = latest.current.nodes.find((node) => node.id === id);
    const nextTitle = title || 'Elemento';
    if (!before || before.title === nextTitle) return;
    snapshot();
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, title: nextTitle } : node)));
  }, [snapshot]);

  const connect = useCallback((from: string, to: string) => {
    if (from === to) { notify('Escolha dois elementos diferentes'); return false; }
    if (latest.current.edges.some((edge) => edge.from === from && edge.to === to)) { notify('Esses elementos já estão ligados nesse sentido'); return false; }
    snapshot();
    const edge: Edge = { id: createId('edge'), from, to, label: '' };
    setEdges((current) => [...current, edge]);
    setSelectedIds([]);
    setSelectedEdgeId(edge.id);
    notify('Seta criada. Digite um texto para ela no painel à direita.');
    return true;
  }, [notify, snapshot]);

  const toggleConnect = useCallback(() => {
    if (selectedIds.length === 2) { connect(selectedIds[0], selectedIds[1]); return; }
    setConnecting((value) => !value);
    setConnectFrom(null);
  }, [connect, selectedIds]);

  const connectClick = useCallback((id: string) => {
    if (!connectFrom) { setConnectFrom(id); setSelectedIds([id]); return; }
    connect(connectFrom, id);
    setConnectFrom(null);
  }, [connect, connectFrom]);

  const cancelConnect = useCallback(() => { setConnecting(false); setConnectFrom(null); }, []);

  const deleteSelection = useCallback(() => {
    if (selectedEdgeId) {
      snapshot();
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      notify('Seta removida');
      return;
    }
    if (!selectedIds.length) return;
    snapshot();
    setNodes((current) => current.filter((node) => !selectedIds.includes(node.id)));
    setEdges((current) => current.filter((edge) => !selectedIds.includes(edge.from) && !selectedIds.includes(edge.to)));
    setSelectedIds([]);
    notify(selectedIds.length > 1 ? `${selectedIds.length} elementos removidos` : 'Elemento removido');
  }, [notify, selectedEdgeId, selectedIds, snapshot]);

  const duplicateSelection = useCallback(() => {
    const chosen = latest.current.nodes.filter((node) => selectedIds.includes(node.id));
    if (!chosen.length) { notify('Selecione um elemento para duplicar'); return; }
    snapshot();
    const idMap = new Map<string, string>();
    const copies = chosen.map((node) => { const id = createId('node'); idMap.set(node.id, id); return { ...node, id, x: node.x + 36, y: node.y + 36 }; });
    const copiedEdges = latest.current.edges
      .filter((edge) => idMap.has(edge.from) && idMap.has(edge.to))
      .map((edge) => ({ ...edge, id: createId('edge'), from: idMap.get(edge.from)!, to: idMap.get(edge.to)! }));
    setNodes((current) => [...current, ...copies]);
    setEdges((current) => [...current, ...copiedEdges]);
    setSelectedIds(copies.map((node) => node.id));
    notify(copies.length > 1 ? `${copies.length} elementos duplicados` : 'Elemento duplicado');
  }, [notify, selectedIds, snapshot]);

  const nudgeSelection = useCallback((dx: number, dy: number) => {
    if (!selectedIds.length) return;
    setNodes((current) => current.map((node) => (selectedIds.includes(node.id) ? { ...node, x: Math.max(0, node.x + dx), y: Math.max(0, node.y + dy) } : node)));
  }, [selectedIds]);

  const updateEdge = useCallback((id: string, patch: Partial<Edge>) => {
    setEdges((current) => current.map((edge) => (edge.id === id ? { ...edge, ...patch } : edge)));
  }, []);

  const reverseEdge = useCallback((id: string) => {
    snapshot();
    setEdges((current) => current.map((edge) => (edge.id === id ? { ...edge, from: edge.to, to: edge.from } : edge)));
    notify('Sentido da seta invertido');
  }, [notify, snapshot]);

  return {
    nodes, edges, setNodes, setEdges,
    selectedIds, setSelectedIds, selectedEdgeId, setSelectedEdgeId,
    connecting, connectFrom, revision,
    canUndo: historySize.undo > 0,
    canRedo: historySize.redo > 0,
    snapshot, undo, redo, selectNode, selectEdge, selectAll, clearSelection, addShape, replaceBoard, updateSelected, renameNode,
    connect, toggleConnect, connectClick, cancelConnect, deleteSelection, duplicateSelection, nudgeSelection, updateEdge, reverseEdge,
  };
}

export type Board = ReturnType<typeof useBoard>;
