'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createId, initialEdges, initialNodes, paletteValues, shapeOptions } from './types';
import type { Edge, ShapeKind, ShapeNode } from './types';

type Snapshot = { nodes: ShapeNode[]; edges: Edge[] };

/** Estado do quadro manual: formas, conexões, seleção e histórico de desfazer. */
export function useBoard(notify: (message: string) => void) {
  const [nodes, setNodes] = useState<ShapeNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [revision, setRevision] = useState(0);
  const history = useRef<Snapshot[]>([]);
  const latest = useRef<Snapshot>({ nodes, edges });

  useEffect(() => { latest.current = { nodes, edges }; }, [nodes, edges]);

  const snapshot = useCallback(() => {
    history.current.push({ nodes: latest.current.nodes, edges: latest.current.edges });
    if (history.current.length > 60) history.current.shift();
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) { notify('Não há nada para desfazer'); return; }
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setSelectedIds([]);
    setSelectedEdgeId(null);
    setCanUndo(history.current.length > 0);
    notify('Ação desfeita');
  }, [notify]);

  const selectNode = useCallback((id: string, additive: boolean) => {
    setSelectedEdgeId(null);
    setSelectedIds((current) => (additive ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id]));
  }, []);

  const clearSelection = useCallback(() => { setSelectedIds([]); setSelectedEdgeId(null); }, []);

  const addShape = useCallback((kind: ShapeKind = 'process') => {
    snapshot();
    const label = shapeOptions.find((shape) => shape.kind === kind)?.label || 'Forma';
    const count = latest.current.nodes.length;
    const titles: Record<ShapeKind, string> = { process: 'Novo elemento', decision: 'Decisão?', database: 'Banco de dados', note: 'Escreva uma nota', actor: 'Pessoa', terminator: 'Início ou fim' };
    const node: ShapeNode = {
      id: createId('node'),
      title: titles[kind],
      kind,
      x: 130 + (count % 5) * 42,
      y: 110 + (count % 6) * 39,
      w: kind === 'note' ? 185 : 165,
      h: kind === 'note' ? 100 : kind === 'actor' ? 92 : 76,
      color: paletteValues[count % paletteValues.length],
    };
    setNodes((current) => [...current, node]);
    setSelectedIds([node.id]);
    setSelectedEdgeId(null);
    notify(`${label} adicionada ao quadro`);
  }, [notify, snapshot]);

  const replaceBoard = useCallback((next: { nodes: ShapeNode[]; edges: Edge[] }) => {
    snapshot();
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedIds([]);
    setSelectedEdgeId(null);
    setConnecting(false);
    setConnectFrom(null);
    setRevision((value) => value + 1);
  }, [snapshot]);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, x, y } : node)));
  }, []);

  const updateSelected = useCallback((patch: Partial<ShapeNode>) => {
    setNodes((current) => current.map((node) => (selectedIds.includes(node.id) ? { ...node, ...patch } : node)));
  }, [selectedIds]);

  const renameNode = useCallback((id: string, title: string) => {
    snapshot();
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, title: title || 'Elemento' } : node)));
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

  /** Botão "Conectar": liga os dois selecionados, ou liga o modo de clicar origem e destino. */
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
    notify(selectedIds.length > 1 ? 'Elementos removidos' : 'Elemento removido');
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
    notify('Elemento duplicado');
  }, [notify, selectedIds, snapshot]);

  const updateEdge = useCallback((id: string, patch: Partial<Edge>) => {
    setEdges((current) => current.map((edge) => (edge.id === id ? { ...edge, ...patch } : edge)));
  }, []);

  const reverseEdge = useCallback((id: string) => {
    snapshot();
    setEdges((current) => current.map((edge) => (edge.id === id ? { ...edge, from: edge.to, to: edge.from } : edge)));
  }, [snapshot]);

  return {
    nodes, edges, setNodes, setEdges,
    selectedIds, setSelectedIds, selectedEdgeId, setSelectedEdgeId,
    connecting, connectFrom, canUndo, revision,
    snapshot, undo, selectNode, clearSelection, addShape, replaceBoard, moveNode, updateSelected, renameNode,
    connect, toggleConnect, connectClick, cancelConnect, deleteSelection, duplicateSelection, updateEdge, reverseEdge,
  };
}

export type Board = ReturnType<typeof useBoard>;
