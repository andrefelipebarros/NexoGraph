import { BRACKET_COLORS, type Token } from '@/lib/mermaid-highlight';

/**
 * Desenha um token do realce de sintaxe. Fica fora do editor para que a home
 * (componente de servidor) e o editor (componente de cliente) usem o mesmo visual.
 */
export function renderToken(token: Token, index: number, matched: Set<number>) {
  if (token.cls === 'indent') {
    const width = token.text.replace(/\t/g, '  ').length;
    const guides = Math.floor(width / 2);
    return (
      <span key={index}>
        {Array.from({ length: guides }, (_, g) => <span key={g} className="ce-guide" />)}
        {width % 2 === 1 ? ' ' : ''}
      </span>
    );
  }
  let className: string | undefined;
  if (token.cls === 'bracket') {
    className = token.bad ? 'tk-bad' : `tk-b${(token.depth ?? 0) % BRACKET_COLORS}`;
    if (matched.has(token.start)) className += ' tk-match';
  } else if (token.cls !== 'ws' && token.cls !== 'plain') {
    className = `tk-${token.cls}`;
  }
  return <span key={index} className={className}>{token.text}</span>;
}
