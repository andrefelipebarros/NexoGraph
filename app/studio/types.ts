import { Database, Diamond, RectangleHorizontal, Square, StickyNote, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Mode = 'manual' | 'mermaid' | 'teaching';
export type ShapeKind = 'process' | 'decision' | 'database' | 'note' | 'terminator' | 'actor';
export type ShapeNode = { id: string; title: string; kind: ShapeKind; x: number; y: number; w: number; h: number; color: string };
export type Edge = { id: string; from: string; to: string; label?: string };
export type LessonLayout = 'linear' | 'tree' | 'tree-reverse';
export type Slide = { id: string; title: string; subtitle: string; bullets: string[]; accent: string; parentId?: string | null };

export const shapeOptions: { kind: ShapeKind; label: string; hint: string; Icon: LucideIcon }[] = [
  { kind: 'process', label: 'Caixa', hint: 'Etapa, serviço ou conceito', Icon: Square },
  { kind: 'decision', label: 'Decisão', hint: 'Pergunta com caminhos', Icon: Diamond },
  { kind: 'database', label: 'Banco de dados', hint: 'Dados guardados', Icon: Database },
  { kind: 'note', label: 'Nota', hint: 'Comentário solto', Icon: StickyNote },
  { kind: 'terminator', label: 'Início ou fim', hint: 'Ponta do fluxo', Icon: RectangleHorizontal },
  { kind: 'actor', label: 'Pessoa', hint: 'Usuário ou ator', Icon: User },
];

export const colorPalette = [
  { value: '#4aa3ff', name: 'Azul' },
  { value: '#3ddc97', name: 'Verde' },
  { value: '#ffc233', name: 'Amarelo' },
  { value: '#ff9e64', name: 'Laranja' },
  { value: '#ff6b81', name: 'Rosa' },
  { value: '#c586e8', name: 'Lilás' },
  { value: '#9aa3b2', name: 'Cinza' },
];
export const paletteValues = colorPalette.map((item) => item.value);

export const initialNodes: ShapeNode[] = [
  { id: 'n1', title: 'Usuário', kind: 'actor', x: 20, y: 157, w: 120, h: 92, color: '#4aa3ff' },
  { id: 'n2', title: 'API Gateway', kind: 'process', x: 200, y: 165, w: 140, h: 76, color: '#3ddc97' },
  { id: 'n3', title: 'Serviço', kind: 'process', x: 400, y: 165, w: 140, h: 76, color: '#3ddc97' },
  { id: 'n4', title: 'Banco de dados', kind: 'database', x: 600, y: 160, w: 150, h: 86, color: '#ffc233' },
  { id: 'n5', title: 'Regras de negócio', kind: 'note', x: 395, y: 330, w: 150, h: 90, color: '#ff9e64' },
];
export const initialEdges: Edge[] = [
  { id: 'e1', from: 'n1', to: 'n2', label: 'HTTPS' },
  { id: 'e2', from: 'n2', to: 'n3', label: 'encaminha' },
  { id: 'e3', from: 'n3', to: 'n4', label: 'consulta' },
  { id: 'e4', from: 'n3', to: 'n5', label: 'valida' },
];
export const initialSlides: Slide[] = [
  { id: 's1', parentId: null, title: 'O que é UML?', subtitle: 'Uma linguagem visual para descrever, discutir e documentar sistemas.', bullets: ['UML não é uma linguagem de programação.', 'Cada diagrama destaca uma perspectiva diferente do sistema.'], accent: '#4aa3ff' },
  { id: 's2', parentId: 's1', title: 'Comece pela pergunta', subtitle: 'Escolha o diagrama de acordo com aquilo que você precisa explicar.', bullets: ['Estrutura: quais peças existem e como se relacionam?', 'Comportamento: o que acontece e em qual ordem?'], accent: '#c586e8' },
  { id: 's3', parentId: 's2', title: 'Diagrama de classes', subtitle: 'Mostra a estrutura estática do sistema.', bullets: ['Classes organizam atributos e operações.', 'Associações, herança e composição mostram relações entre tipos.'], accent: '#3ddc97' },
  { id: 's4', parentId: 's2', title: 'Diagrama de sequência', subtitle: 'Mostra mensagens entre participantes ao longo do tempo.', bullets: ['Cada participante aparece como uma linha de vida.', 'As mensagens são lidas de cima para baixo.'], accent: '#ffc233' },
  { id: 's5', parentId: 's2', title: 'Escolha e conecte as visões', subtitle: 'Os diagramas se complementam para contar uma explicação coerente.', bullets: ['Use classes para explicar a estrutura.', 'Use sequência para demonstrar uma interação.', 'Avance bloco por bloco para montar o raciocínio com a turma.'], accent: '#ff6b81' },
];

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeLessonSlides(slides: Slide[]): Slide[] {
  return slides.map((slide, index) => {
    const hasParent = Object.prototype.hasOwnProperty.call(slide, 'parentId');
    return { ...slide, parentId: hasParent ? (slide.parentId ?? null) : index > 0 ? slides[index - 1].id : null };
  });
}

function borderPoint(node: ShapeNode, tx: number, ty: number) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = node.w / 2;
  const hh = node.h / 2;
  const t = node.kind === 'decision'
    ? 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh)
    : Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy));
  return { x: cx + dx * t, y: cy + dy * t };
}

export function edgeLine(a: ShapeNode, b: ShapeNode, gap = 3) {
  const start = borderPoint(a, b.x + b.w / 2, b.y + b.h / 2);
  const end = borderPoint(b, a.x + a.w / 2, a.y + a.h / 2);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x1: start.x + (dx / length) * gap,
    y1: start.y + (dy / length) * gap,
    x2: end.x - (dx / length) * gap,
    y2: end.y - (dy / length) * gap,
  };
}

export function escapeXml(value: string) {
  const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };
  return value.replace(/[<>&"']/g, (char) => entities[char] ?? char);
}

function mermaidSafeLabel(value: string) {
  return value.replace(/[\r\n]+/g, ' ').replace(/\|/g, '/').replace(/"/g, "'").replace(/</g, '‹').replace(/>/g, '›').trim() || 'Sem título';
}

export type CanvasColors = { bg: string; raise: string; fg: string; dim: string; edge: string; mono: boolean };

export function generateMermaidFromCanvas(nodes: ShapeNode[], edges: Edge[], colors: CanvasColors) {
  if (!nodes.length) return 'flowchart LR\n  %% Adicione elementos ao quadro para gerar um diagrama Mermaid.';
  const nodeIds = new Map(nodes.map((node, index) => [node.id, `N${index + 1}`]));
  const shapeByKind: Record<ShapeKind, string> = { process: 'rect', decision: 'diamond', database: 'cyl', note: 'doc', terminator: 'stadium', actor: 'person' };
  const lines = [
    'flowchart LR',
    '  %% Gerado pelo quadro do NexoGraph',
    ...nodes.map((node) => `  ${nodeIds.get(node.id)}@{ shape: ${shapeByKind[node.kind]}, label: "${mermaidSafeLabel(node.title)}" }`),
    ...edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)).map((edge) => {
      const from = nodeIds.get(edge.from)!;
      const to = nodeIds.get(edge.to)!;
      const label = edge.label?.trim();
      return label ? `  ${from} -->|${mermaidSafeLabel(label)}| ${to}` : `  ${from} --> ${to}`;
    }),
    ...nodes.map((node) => colors.mono
      ? `  style ${nodeIds.get(node.id)} fill:#ffffff,stroke:#000000,color:#000000,stroke-width:2px`
      : `  style ${nodeIds.get(node.id)} fill:${colors.raise},stroke:${node.color},color:${colors.fg},stroke-width:2px`),
  ];
  return lines.join('\n');
}

export function svgForDiagram(nodes: ShapeNode[], edges: Edge[], colors: CanvasColors) {
  const width = Math.max(1200, ...nodes.map((n) => n.x + n.w + 80));
  const height = Math.max(720, ...nodes.map((n) => n.y + n.h + 80));
  const edgeSvg = edges.map((edge) => {
    const a = nodes.find((n) => n.id === edge.from);
    const b = nodes.find((n) => n.id === edge.to);
    if (!a || !b) return '';
    const { x1, y1, x2, y2 } = edgeLine(a, b);
    const label = edge.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" text-anchor="middle" fill="${colors.dim}" font-size="13" font-family="sans-serif" stroke="${colors.bg}" stroke-width="4" paint-order="stroke">${escapeXml(edge.label)}</text>` : '';
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.edge}" stroke-width="2" stroke-linecap="round" marker-end="url(#arrow)"/>${label}`;
  }).join('');
  const nodesSvg = nodes.map((n) => {
    const stroke = colors.mono ? '#000000' : n.color;
    const common = `fill="${colors.raise}" stroke="${stroke}" stroke-width="2"`;
    let shape: string;
    if (n.kind === 'decision') shape = `<polygon points="${n.x + n.w / 2},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${n.x + n.w / 2},${n.y + n.h} ${n.x},${n.y + n.h / 2}" ${common}/>`;
    else if (n.kind === 'terminator') shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.h / 2}" ${common}/>`;
    else if (n.kind === 'database') shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${Math.min(26, n.w / 4)}" ry="12" ${common}/><ellipse cx="${n.x + n.w / 2}" cy="${n.y + 10}" rx="${n.w / 2 - 2}" ry="9" fill="none" stroke="${stroke}" stroke-width="2"/>`;
    else shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.kind === 'note' ? 3 : n.kind === 'actor' ? 18 : 8}" ${common}${n.kind === 'note' ? ' stroke-dasharray="6 4"' : ''}/>`;
    return `${shape}<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 5}" text-anchor="middle" fill="${colors.fg}" font-size="16" font-family="sans-serif">${escapeXml(n.title)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${colors.edge}"/></marker></defs><rect width="100%" height="100%" fill="${colors.bg}"/>${edgeSvg}${nodesSvg}</svg>`;
}
