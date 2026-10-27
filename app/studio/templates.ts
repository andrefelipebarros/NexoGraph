import type { CatalogItem } from './catalog';
import type { DesignPattern } from './design-patterns';
import { createId, paletteValues } from './types';
import type { Edge, ShapeKind, ShapeNode, Slide } from './types';

const [BLUE, GREEN, YELLOW, ORANGE, PINK, LILAC] = paletteValues;

type Board = { nodes: ShapeNode[]; edges: Edge[] };

function node(title: string, kind: ShapeKind, x: number, y: number, w: number, h: number, color: string): ShapeNode {
  return { id: createId('node'), title, kind, x, y, w, h, color };
}
function link(from: ShapeNode, to: ShapeNode, label = ''): Edge {
  return { id: createId('edge'), from: from.id, to: to.id, label };
}

/** Monta um quadro inicial a partir de um item da biblioteca de diagramas. */
export function boardFromCatalog(item: CatalogItem): Board {
  const title = item.title.toLowerCase();
  if (title.includes('classe')) {
    const user = node('Usuario', 'process', 120, 120, 190, 90, BLUE);
    const userId = node('+ id: UUID', 'note', 120, 220, 190, 72, BLUE);
    const order = node('Pedido', 'process', 510, 120, 190, 90, GREEN);
    const orderTotal = node('+ total(): Decimal', 'note', 510, 220, 190, 72, GREEN);
    const orderItem = node('ItemPedido', 'process', 900, 120, 190, 90, YELLOW);
    return { nodes: [user, userId, order, orderTotal, orderItem], edges: [link(user, order, '1 para 0..*'), link(order, orderItem, '1 para 1..*')] };
  }
  if (title.includes('sequência') || title.includes('autenticação')) {
    const person = node('Usuário', 'actor', 100, 120, 150, 90, BLUE);
    const front = node('Frontend', 'process', 350, 120, 170, 78, GREEN);
    const api = node('API', 'process', 640, 120, 170, 78, YELLOW);
    const db = node('Banco', 'database', 930, 120, 170, 85, ORANGE);
    return { nodes: [person, front, api, db], edges: [link(person, front, 'solicita'), link(front, api, 'requisição'), link(api, db, 'consulta')] };
  }
  if (title.includes('mental')) {
    const center = node('Tema central', 'decision', 470, 260, 190, 130, BLUE);
    const leaves = [
      node('Conceito A', 'note', 150, 100, 190, 90, GREEN),
      node('Conceito B', 'note', 850, 100, 190, 90, YELLOW),
      node('Exemplos', 'note', 150, 470, 190, 90, ORANGE),
      node('Aplicações', 'note', 850, 470, 190, 90, PINK),
    ];
    return { nodes: [center, ...leaves], edges: leaves.map((leaf) => link(center, leaf)) };
  }
  const firstKind: ShapeKind = title.includes('decisão') || title.includes('swot') ? 'decision' : 'process';
  const main = node(item.title, firstKind, 420, 250, 235, firstKind === 'decision' ? 130 : 88, BLUE);
  const input = node('Entrada / contexto', 'note', 115, 105, 190, 88, GREEN);
  const step = node('Etapa / componente', 'process', 800, 105, 200, 82, YELLOW);
  const result = node('Resultado esperado', 'terminator', 800, 440, 200, 72, ORANGE);
  return { nodes: [main, input, step, result], edges: [link(input, main), link(main, step), link(step, result)] };
}

/** Transforma um design pattern em diagrama editável. */
export function boardFromPattern(pattern: DesignPattern): Board {
  const nodes: ShapeNode[] = pattern.nodes.map((spec, index) => ({
    id: createId('pattern-node'),
    title: spec.title,
    kind: /banco|database|store|cache|repositório|event store/i.test(spec.title) ? 'database' : /cliente|usuário|client|publisher/i.test(spec.title) ? 'actor' : 'process',
    x: 70 + index * 255,
    y: 190,
    w: 205,
    h: 92,
    color: paletteValues[index % paletteValues.length],
  }));
  const edges: Edge[] = pattern.links.map((item) => ({ id: createId('pattern-edge'), from: nodes[item.from].id, to: nodes[item.to].id, label: item.label }));
  return { nodes, edges };
}

/** Transforma um design pattern em uma aula que se revela bloco a bloco. */
export function lessonFromPattern(pattern: DesignPattern): Slide[] {
  return [
    { id: createId('lesson'), title: `Problema: ${pattern.name}`, subtitle: pattern.intent, bullets: [`Quando usar: ${pattern.useCase}`, `Família: ${pattern.family}, ${pattern.category}`, 'Avance para revelar cada participante e sua responsabilidade.'], accent: BLUE },
    ...pattern.nodes.map((spec, index) => ({
      id: createId('lesson'),
      title: spec.title,
      subtitle: spec.description,
      bullets: pattern.links
        .filter((item) => item.from === index || item.to === index)
        .slice(0, 2)
        .map((item) => `${item.from === index ? 'Envia para' : 'Recebe de'} ${pattern.nodes[item.from === index ? item.to : item.from].title}: ${item.label}.`)
        .concat(index === 0 ? [`Exemplo: ${pattern.useCase}`] : [])
        .slice(0, 3),
      accent: paletteValues[(index + 1) % paletteValues.length],
    })),
    { id: createId('lesson'), title: 'Como as peças se conectam', subtitle: `Visão geral de ${pattern.name}: observe o fluxo completo, da solicitação ao resultado.`, bullets: pattern.links.map((item) => `${pattern.nodes[item.from].title} para ${pattern.nodes[item.to].title}: ${item.label}.`).slice(0, 5), accent: LILAC },
  ];
}
