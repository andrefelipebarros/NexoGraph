'use client';

import { useState } from 'react';
import { FileCode2 } from 'lucide-react';
import { renderToken } from '@/components/code-tokens';
import { highlightMermaid } from '@/lib/mermaid-highlight';

const SOURCE = `flowchart LR
  U([Usuário]) -->|HTTPS| G[Gateway]
  G --> S[[Serviço de pedidos]]
  S -.-> C[(Cache)]
  S ==> D[(Banco de dados)]`;

const highlighted = highlightMermaid(SOURCE);
const NO_MATCH = new Set<number>();

const NODE_LINES: Record<string, number[]> = { U: [2], G: [2, 3], S: [3, 4, 5], C: [4], D: [5] };
const EDGE_LINES: Record<string, number[]> = { e1: [2], e2: [3], e3: [4], e4: [5] };

const NONE: number[] = [];

function cylinder(x: number, y: number, w: number, h: number) {
  const ry = 8;
  const rx = w / 2;
  return {
    body: `M${x},${y + ry} A${rx},${ry} 0 0 1 ${x + w},${y + ry} V${y + h - ry} A${rx},${ry} 0 0 1 ${x},${y + h - ry} Z`,
    lid: `M${x},${y + ry} A${rx},${ry} 0 0 0 ${x + w},${y + ry}`,
  };
}

export function HeroDemo() {
  const [focus, setFocus] = useState<number[]>(NONE);
  const dim = (lines: number[]) => focus.length > 0 && !lines.some((line) => focus.includes(line));
  const cache = cylinder(486, 36, 104, 56);
  const bank = cylinder(486, 188, 104, 56);
  const over = (lines: number[]) => ({
    onMouseEnter: () => setFocus(lines),
    onMouseLeave: () => setFocus(NONE),
    onFocus: () => setFocus(lines),
    onBlur: () => setFocus(NONE),
  });

  return (
    <div className="win">
      <div className="win-tabs">
        <span className="win-tab" aria-current="true"><FileCode2 size={14} aria-hidden="true" /> pedidos.mmd</span>
      </div>
      <div className="win-body">
        <div className="win-code">
          <div role="group" aria-label="Código Mermaid de exemplo">
            {highlighted.lines.map((line) => (
              <div
                key={line.number}
                className={`hl-line${focus.includes(line.number) ? ' is-focus' : ''}`}
                tabIndex={0}
                {...over([line.number])}
              >
                <span className="hl-num" aria-hidden="true">{line.number}</span>
                <span className="hl-text">{line.tokens.map((token, index) => renderToken(token, index, NO_MATCH))}</span>
              </div>
            ))}
          </div>
          <div className="win-legend">
            <span>Setas</span>
            <button type="button" className="chip" {...over([2, 3])}><code className="tk-arrow-solid">--&gt;</code> contínua</button>
            <button type="button" className="chip" {...over([4])}><code className="tk-arrow-dotted">-.-&gt;</code> tracejada</button>
            <button type="button" className="chip" {...over([5])}><code className="tk-arrow-thick">==&gt;</code> grossa</button>
          </div>
          <div className="win-legend">
            <span>Colchetes</span>
            <span className="chip"><code className="tk-b0">( )</code> 1º nível</span>
            <span className="chip"><code className="tk-b1">[ ]</code> 2º nível</span>
            <span className="chip"><code className="tk-b2">{'{ }'}</code> 3º nível</span>
          </div>
        </div>
        <div className="win-view">
          <svg className="dg" viewBox="0 0 600 280" role="img" aria-label="Diagrama de pedidos: usuário, gateway, serviço, cache e banco de dados">
            <defs>
              <marker id="hd-solid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path className="dg-head solid" d="M0,0 L10,5 L0,10 z" /></marker>
              <marker id="hd-dotted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path className="dg-head dotted" d="M0,0 L10,5 L0,10 z" /></marker>
              <marker id="hd-thick" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="15" markerHeight="15" markerUnits="userSpaceOnUse" orient="auto"><path className="dg-head thick" d="M0,0 L10,5 L0,10 z" /></marker>
            </defs>

            <g className={`dg-el${dim(EDGE_LINES.e1) ? ' is-dim' : ''}`} {...over(EDGE_LINES.e1)}>
              <line className="dg-edge solid" x1="106" y1="138" x2="165" y2="138" markerEnd="url(#hd-solid)" />
              <line className="dg-hit" x1="106" y1="138" x2="165" y2="138" />
              <text className="dg-label" x="136" y="128" textAnchor="middle">HTTPS</text>
            </g>
            <g className={`dg-el${dim(EDGE_LINES.e2) ? ' is-dim' : ''}`} {...over(EDGE_LINES.e2)}>
              <line className="dg-edge solid" x1="256" y1="138" x2="315" y2="138" markerEnd="url(#hd-solid)" />
              <line className="dg-hit" x1="256" y1="138" x2="315" y2="138" />
            </g>
            <g className={`dg-el${dim(EDGE_LINES.e3) ? ' is-dim' : ''}`} {...over(EDGE_LINES.e3)}>
              <line className="dg-edge dotted" x1="436" y1="128" x2="484" y2="82" markerEnd="url(#hd-dotted)" />
              <line className="dg-hit" x1="436" y1="128" x2="484" y2="82" />
            </g>
            <g className={`dg-el${dim(EDGE_LINES.e4) ? ' is-dim' : ''}`} {...over(EDGE_LINES.e4)}>
              <line className="dg-edge thick" x1="436" y1="148" x2="482" y2="198" markerEnd="url(#hd-thick)" />
              <line className="dg-hit" x1="436" y1="148" x2="482" y2="198" />
            </g>

            <g className={`dg-el dg-node${dim(NODE_LINES.U) ? ' is-dim' : ''}`} {...over(NODE_LINES.U)}>
              <rect x="16" y="116" width="90" height="44" rx="22" />
              <text x="61" y="143" textAnchor="middle">Usuário</text>
            </g>
            <g className={`dg-el dg-node${dim(NODE_LINES.G) ? ' is-dim' : ''}`} {...over(NODE_LINES.G)}>
              <rect x="166" y="116" width="90" height="44" rx="6" />
              <text x="211" y="143" textAnchor="middle">Gateway</text>
            </g>
            <g className={`dg-el dg-node${dim(NODE_LINES.S) ? ' is-dim' : ''}`} {...over(NODE_LINES.S)}>
              <rect x="316" y="116" width="120" height="44" rx="6" />
              <path className="line" d="M326,116 V160 M426,116 V160" />
              <text x="376" y="143" textAnchor="middle">Serviço</text>
            </g>
            <g className={`dg-el dg-node${dim(NODE_LINES.C) ? ' is-dim' : ''}`} {...over(NODE_LINES.C)}>
              <path className="shape" d={cache.body} />
              <path className="line" d={cache.lid} />
              <text x="538" y="70" textAnchor="middle">Cache</text>
            </g>
            <g className={`dg-el dg-node${dim(NODE_LINES.D) ? ' is-dim' : ''}`} {...over(NODE_LINES.D)}>
              <path className="shape" d={bank.body} />
              <path className="line" d={bank.lid} />
              <text x="538" y="222" textAnchor="middle">Banco de dados</text>
            </g>
          </svg>
        </div>
      </div>
      <div className="win-status" aria-hidden="true">
        <span>Ln {focus[0] ?? 1}, Col 1</span>
        <span>flowchart</span>
        <span>0 problemas</span>
      </div>
    </div>
  );
}
