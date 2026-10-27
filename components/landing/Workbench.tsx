'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AlertCircle, Braces, Check, GraduationCap, PencilRuler } from 'lucide-react';
import { renderToken } from '@/components/code-tokens';
import { SketchBoard } from '@/components/SketchBoard';
import type { Slide } from '@/app/studio/types';
import { highlightMermaid } from '@/lib/mermaid-highlight';

const BROKEN = `flowchart LR
  U([Usuário]) --> G[Gateway]
  G --> S[[Serviço de pedidos]]
  S ==> D[(Banco de dados)]
  S -.-> C[(Cache`;
const brokenCode = highlightMermaid(BROKEN);
const NO_MATCH = new Set<number>();

type TabId = 'quadro' | 'codigo' | 'aula';

const tabs: { id: TabId; file: string; Icon: typeof PencilRuler }[] = [
  { id: 'quadro', file: 'quadro', Icon: PencilRuler },
  { id: 'codigo', file: 'diagrama.mmd', Icon: Braces },
  { id: 'aula', file: 'aula', Icon: GraduationCap },
];

const copy: Record<TabId, { title: string; text: string; points: string[]; cta: string }> = {
  quadro: {
    title: 'Arraste, ligue e pronto.',
    text: 'Adicione caixas, decisões e bancos de dados, arraste cada uma para o lugar certo e ligue com setas. Dois cliques editam o texto e Ctrl+Z desfaz.',
    points: ['Seis formas e sete cores para destacar o que importa', 'Setas com texto e com o sentido que você escolher', 'Exporta o desenho em SVG ou PNG'],
    cta: 'Abrir o quadro',
  },
  codigo: {
    title: 'Escreva o código e veja o desenho ao lado.',
    text: 'O editor pinta cada par de colchetes com uma cor por nível e cada tipo de seta com a sua cor. Se faltar um fecha-colchete, a linha fica vermelha e o painel Problemas diz onde.',
    points: ['Dourado, lilás e azul para cada nível de colchetes', 'Seta contínua, tracejada e grossa, cada uma com sua cor', 'Fecha colchetes sozinho, comenta com Ctrl+/ e mostra guias de recuo'],
    cta: 'Abrir o editor',
  },
  aula: {
    title: 'Explique um bloco por vez.',
    text: 'Comece pela raiz no topo e desça pelos ramos. Revele as ideias bloco a bloco ou escolha de qual bloco cada nova ideia nasce para criar caminhos diferentes.',
    points: ['Organização em sequência ou raiz com ramificações', 'Apresentação em tela cheia com navegação pelo teclado', 'Exporta o roteiro e o diagrama em Markdown (.md) para o GitHub'],
    cta: 'Abrir a aula',
  },
};

function MiniBoard() {
  return (
    <svg className="mini-board" viewBox="0 0 520 250" role="img" aria-label="Quadro com quatro elementos ligados por setas e o elemento Serviço selecionado">
      <defs>
        <marker id="mb-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path className="head" d="M0,0 L10,5 L0,10 z" /></marker>
      </defs>
      <line className="edge" x1="130" y1="125" x2="189" y2="125" markerEnd="url(#mb-head)" />
      <line className="edge" x1="300" y1="115" x2="357" y2="76" markerEnd="url(#mb-head)" />
      <line className="edge" x1="420" y1="94" x2="420" y2="167" markerEnd="url(#mb-head)" />
      <text x="160" y="114" style={{ fontSize: 12 }}>HTTPS</text>
      <text x="466" y="136" style={{ fontSize: 12 }}>consulta</text>
      <rect className="node" x="20" y="101" width="110" height="48" rx="24" stroke="#4aa3ff" />
      <text x="75" y="130">Usuário</text>
      <rect className="node" x="190" y="101" width="110" height="48" rx="8" stroke="#3ddc97" />
      <text x="245" y="130">API</text>
      <rect className="node" x="360" y="46" width="120" height="48" rx="8" stroke="#ffc233" />
      <text x="420" y="75">Serviço</text>
      <rect className="node" x="360" y="170" width="120" height="56" rx="14" stroke="#ff9e64" />
      <ellipse cx="420" cy="178" rx="58" ry="8" fill="none" stroke="#ff9e64" strokeWidth="2" />
      <text x="420" y="204">Banco</text>
      <rect className="sel" x="353" y="39" width="134" height="62" rx="3" />
      {[[353, 39], [487, 39], [353, 101], [487, 101]].map(([x, y]) => <rect key={`${x}-${y}`} className="handle" x={x - 4} y={y - 4} width="8" height="8" />)}
    </svg>
  );
}

const demoLesson: Slide[] = [
  { id: 'home-raiz', title: 'Ideia principal', subtitle: 'O primeiro bloco vira a raiz.', bullets: ['Tudo nasce daqui', 'Cada ramo parte dele'], accent: '#4aa3ff', parentId: null },
  { id: 'home-a', title: 'Ramo A', subtitle: 'Uma ideia que se desenvolve.', bullets: ['Explique um detalhe'], accent: '#3ddc97', parentId: 'home-raiz' },
  { id: 'home-b', title: 'Ramo B', subtitle: 'Outro caminho possível.', bullets: ['Compare com o A'], accent: '#ffc233', parentId: 'home-raiz' },
  { id: 'home-c', title: 'Ramo C', subtitle: 'Mais um bloco, ligado à raiz.', bullets: ['Escolha de onde nasce'], accent: '#ff6b81', parentId: 'home-raiz' },
];

function MiniLesson() {
  return (
    <div className="mini-sketch">
      <SketchBoard slides={demoLesson} index={demoLesson.length - 1} onIndex={noop} layout="tree" overview />
    </div>
  );
}

function noop() {}

function CodeVisual() {
  const problem = brokenCode.problems[0];
  return (
    <>
      <div className="wb-code">
        {brokenCode.lines.map((line) => (
          <div className="hl-line" key={line.number}>
            <span className="hl-num" aria-hidden="true">{line.number}</span>
            <span className="hl-text">{line.tokens.map((token, index) => renderToken(token, index, NO_MATCH))}</span>
          </div>
        ))}
      </div>
      {problem && (
        <div className="wb-problem" role="note">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{problem.message} <code>linha {problem.line}</code></span>
        </div>
      )}
      <div className="wb-levels">
        <span><code className="tk-b0">(</code> 1º nível</span>
        <span><code className="tk-b1">[</code> 2º nível</span>
        <span><code className="tk-b2">{'{'}</code> 3º nível</span>
        <span><code className="tk-arrow-solid">--&gt;</code><code className="tk-arrow-dotted">-.-&gt;</code><code className="tk-arrow-thick">==&gt;</code> setas</span>
      </div>
    </>
  );
}

export function Workbench() {
  const [active, setActive] = useState<TabId>('quadro');
  const refs = useRef<Record<TabId, HTMLButtonElement | null>>({ quadro: null, codigo: null, aula: null });
  const current = copy[active];

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else return;
    event.preventDefault();
    setActive(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };

  return (
    <div className="win">
      <div className="win-tabs" role="tablist" aria-label="Três jeitos de criar" onKeyDown={onKey}>
        {tabs.map(({ id, file, Icon }) => (
          <button
            key={id}
            ref={(node) => { refs.current[id] = node; }}
            type="button"
            role="tab"
            id={`wb-tab-${id}`}
            aria-selected={active === id}
            aria-controls="wb-panel"
            tabIndex={active === id ? 0 : -1}
            className="win-tab"
            onClick={() => setActive(id)}
          >
            <Icon size={14} aria-hidden="true" /> {file}
          </button>
        ))}
      </div>
      <div className="wb-body" role="tabpanel" id="wb-panel" aria-labelledby={`wb-tab-${active}`}>
        <div className="wb-text">
          <h3>{current.title}</h3>
          <p>{current.text}</p>
          <ul>
            {current.points.map((point) => <li key={point}><Check size={15} aria-hidden="true" /><span>{point}</span></li>)}
          </ul>
          <Link href="/studio" className="btn btn-primary">{current.cta}</Link>
        </div>
        <div className="wb-visual">
          {active === 'quadro' && <MiniBoard />}
          {active === 'codigo' && <CodeVisual />}
          {active === 'aula' && <MiniLesson />}
        </div>
      </div>
    </div>
  );
}
