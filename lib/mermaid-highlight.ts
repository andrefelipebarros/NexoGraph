
export type DiagramKind = 'flowchart' | 'sequence' | 'class' | 'er' | 'state' | 'other';

export type TokenClass =
  | 'ws'
  | 'indent'
  | 'plain'
  | 'kw'
  | 'dir'
  | 'id'
  | 'label'
  | 'elabel'
  | 'str'
  | 'comment'
  | 'arrow-solid'
  | 'arrow-dotted'
  | 'arrow-thick'
  | 'arrow-plain'
  | 'bracket';

export type Token = {
  text: string;
  cls: TokenClass;
  start: number;
  depth?: number;
  bad?: boolean;
};

export type HighlightedLine = {
  number: number;
  start: number;
  text: string;
  indent: number;
  tokens: Token[];
};

export type Problem = {
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning';
  source: 'colchetes' | 'mermaid';
};

export type BracketInfo = { partner: number | null; bad: boolean };

export type Highlighted = {
  kind: DiagramKind;
  lines: HighlightedLine[];
  problems: Problem[];
  bracketAt: Map<number, BracketInfo>;
};

export const BRACKET_COLORS = 3;

const KEYWORDS = new Set([
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'gantt', 'pie',
  'journey', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart', 'requirementDiagram', 'subgraph', 'end', 'direction',
  'participant', 'actor', 'as', 'Note', 'note', 'over', 'of', 'loop', 'alt', 'else', 'opt', 'par', 'and', 'rect', 'critical',
  'break', 'activate', 'deactivate', 'autonumber', 'class', 'classDef', 'style', 'linkStyle', 'click', 'title', 'section',
  'state', 'namespace', 'interface', 'dateFormat', 'axisFormat', 'accTitle', 'accDescr',
]);
const TEXT_KEYWORDS = new Set(['title', 'section', 'as', 'accTitle', 'accDescr']);
const DIRECTIONS = new Set(['TB', 'TD', 'BT', 'RL', 'LR']);
const DIRECTION_OWNERS = new Set(['flowchart', 'graph', 'direction']);
const OPENERS: Record<string, string> = { '[': ']', '(': ')', '{': '}' };
const CLOSERS = new Set([']', ')', '}']);

type ArrowRule = { re: RegExp; cls: TokenClass | ((match: string) => TokenClass) };

const FLOW_ARROWS: ArrowRule[] = [
  { re: /^[ox<]?={2,}[>xo]?/y, cls: 'arrow-thick' },
  { re: /^[ox<]?-\.+-[>xo]?/y, cls: 'arrow-dotted' },
  { re: /^\.+->/y, cls: 'arrow-dotted' },
  { re: /^[ox<]?-{2,}[>xo]?/y, cls: 'arrow-solid' },
  { re: /^~{3,}/y, cls: 'arrow-plain' },
];
const SEQUENCE_ARROWS: ArrowRule[] = [
  { re: /^(?:<<)?-{1,2}(?:>>|>|[x)])/y, cls: (m) => (m.includes('--') ? 'arrow-dotted' : 'arrow-solid') },
];
const CLASS_ARROWS: ArrowRule[] = [
  { re: /^(?:<\|--|--\|>|\*--|--\*|o--|--o|<--|-->|--)/y, cls: 'arrow-solid' },
  { re: /^(?:<\.\.|\.\.>|\.\.\|>|<\|\.\.|\.\.)/y, cls: 'arrow-dotted' },
];
const ER_ARROWS: ArrowRule[] = [
  { re: /^(?:\|\||\|o|\}o|\}\|)(?:--|\.\.)(?:\|\||o\||o\{|\|\{)/y, cls: (m) => (m.includes('..') ? 'arrow-dotted' : 'arrow-solid') },
];

function arrowRulesFor(kind: DiagramKind): ArrowRule[] {
  switch (kind) {
    case 'sequence': return SEQUENCE_ARROWS;
    case 'class': return CLASS_ARROWS;
    case 'er': return ER_ARROWS;
    default: return FLOW_ARROWS;
  }
}

export function detectKind(source: string): DiagramKind {
  let inFrontmatter = false;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('%%')) continue;
    if (line === '---') { inFrontmatter = !inFrontmatter; continue; }
    if (inFrontmatter) continue;
    if (/^(flowchart|graph)\b/.test(line)) return 'flowchart';
    if (/^sequenceDiagram\b/.test(line)) return 'sequence';
    if (/^classDiagram\b/.test(line)) return 'class';
    if (/^erDiagram\b/.test(line)) return 'er';
    if (/^stateDiagram\b/.test(line)) return 'state';
    return 'other';
  }
  return 'other';
}

type Opener = { char: string; expects: string; offset: number; line: number; col: number; token: Token; depth: number; reported: boolean };

export function highlightMermaid(source: string): Highlighted {
  const kind = detectKind(source);
  const rules = arrowRulesFor(kind);
  const rawLines = source.split('\n');
  const lines: HighlightedLine[] = [];
  const problems: Problem[] = [];
  const bracketAt = new Map<number, BracketInfo>();
  const stack: Opener[] = [];
  const wordRe = /[\p{L}\p{N}_]+/uy;
  let offset = 0;

  rawLines.forEach((text, lineIndex) => {
    const tokens: Token[] = [];
    const lineStart = offset;
    let i = 0;
    let inText = false;
    let prevKeyword = '';
    const push = (t: string, cls: TokenClass, extra: Partial<Token> = {}) => {
      tokens.push({ text: t, cls, start: lineStart + i, ...extra });
      i += t.length;
    };

    while (i < text.length) {
      const ch = text[i];

      if (ch === ' ' || ch === '\t') {
        let j = i;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j += 1;
        push(text.slice(i, j), i === 0 ? 'indent' : 'ws');
        continue;
      }
      if (ch === '%' && text[i + 1] === '%') { push(text.slice(i), 'comment'); break; }
      if (ch === '"') {
        const end = text.indexOf('"', i + 1);
        push(end === -1 ? text.slice(i) : text.slice(i, end + 1), 'str');
        continue;
      }

      if (!inText) {
        let matched = false;
        for (const rule of rules) {
          rule.re.lastIndex = 0;
          const m = rule.re.exec(text.slice(i));
          if (m) {
            const cls = typeof rule.cls === 'function' ? rule.cls(m[0]) : rule.cls;
            push(m[0], cls);
            matched = true;
            break;
          }
        }
        if (matched) continue;
      }

      if (ch === '|' && stack.length === 0 && (kind === 'flowchart' || kind === 'state' || kind === 'other')) {
        const end = text.indexOf('|', i + 1);
        if (end !== -1) { push(text.slice(i, end + 1), 'elabel'); continue; }
      }

      if (OPENERS[ch] || (ch === '>' && kind === 'flowchart' && i > 0 && /[\p{L}\p{N}_]/u.test(text[i - 1]))) {
        const expects = OPENERS[ch] ?? ']';
        const depth = stack.length;
        const token: Token = { text: ch, cls: 'bracket', start: lineStart + i, depth };
        tokens.push(token);
        stack.push({ char: ch, expects, offset: lineStart + i, line: lineIndex + 1, col: i + 1, token, depth, reported: false });
        bracketAt.set(lineStart + i, { partner: null, bad: false });
        i += 1;
        continue;
      }

      if (CLOSERS.has(ch)) {
        const top = stack[stack.length - 1];
        const token: Token = { text: ch, cls: 'bracket', start: lineStart + i, depth: top ? top.depth : 0 };
        if (top && top.expects === ch) {
          stack.pop();
          bracketAt.set(lineStart + i, { partner: top.offset, bad: false });
          bracketAt.set(top.offset, { partner: lineStart + i, bad: false });
        } else {
          token.bad = true;
          bracketAt.set(lineStart + i, { partner: null, bad: true });
          if (top) {
            top.token.bad = true;
            top.reported = true;
            bracketAt.set(top.offset, { partner: null, bad: true });
            problems.push({ line: lineIndex + 1, col: i + 1, severity: 'error', source: 'colchetes', message: `Esperava "${top.expects}" para fechar o "${top.char}" da linha ${top.line}, mas encontrou "${ch}".` });
          } else {
            problems.push({ line: lineIndex + 1, col: i + 1, severity: 'error', source: 'colchetes', message: `O "${ch}" não tem um "${ch === ']' ? '[' : ch === ')' ? '(' : '{'}" correspondente.` });
          }
        }
        tokens.push(token);
        i += 1;
        continue;
      }

      wordRe.lastIndex = i;
      const wm = wordRe.exec(text);
      if (wm && wm.index === i) {
        let word = wm[0];
        if (word === 'stateDiagram' && text.startsWith('stateDiagram-v2', i)) word = 'stateDiagram-v2';
        let cls: TokenClass;
        if (stack.length > 0 || inText) cls = 'label';
        else if (KEYWORDS.has(word)) cls = 'kw';
        else if (DIRECTIONS.has(word) && DIRECTION_OWNERS.has(prevKeyword)) cls = 'dir';
        else cls = 'id';
        push(word, cls);
        if (cls === 'kw') { prevKeyword = word; if (TEXT_KEYWORDS.has(word)) inText = true; }
        else prevKeyword = '';
        continue;
      }

      if (ch === ':' && stack.length === 0 && kind !== 'flowchart' && kind !== 'other') {
        push(ch, 'plain');
        inText = true;
        continue;
      }

      push(ch, stack.length > 0 || inText ? 'label' : 'plain');
    }

    const indentToken = tokens[0]?.cls === 'indent' ? tokens[0].text : '';
    const indent = indentToken.replace(/\t/g, '  ').length;
    lines.push({ number: lineIndex + 1, start: lineStart, text, indent, tokens });
    offset += text.length + 1;
  });

  for (const open of stack) {
    open.token.bad = true;
    bracketAt.set(open.offset, { partner: null, bad: true });
    if (!open.reported) {
      problems.push({ line: open.line, col: open.col, severity: 'error', source: 'colchetes', message: `O "${open.char}" nunca foi fechado. Falta um "${open.expects}".` });
    }
  }
  problems.sort((a, b) => a.line - b.line || a.col - b.col);
  return { kind, lines, problems, bracketAt };
}

export function matchAtCaret(bracketAt: Map<number, BracketInfo>, caret: number): [number, number] | null {
  for (const candidate of [caret - 1, caret]) {
    const info = bracketAt.get(candidate);
    if (info && info.partner !== null && !info.bad) return [candidate, info.partner];
  }
  return null;
}

export function lineColFromOffset(source: string, offset: number) {
  const before = source.slice(0, offset);
  const line = before.split('\n').length;
  const col = offset - (before.lastIndexOf('\n') + 1) + 1;
  return { line, col };
}

export function parseMermaidError(message: string, totalLines?: number): { line?: number; text: string; detail: string } {
  const detail = message.trim();
  const lineMatch = /line\s+(\d+)/i.exec(detail);
  const line = lineMatch ? (totalLines ? Math.min(Number(lineMatch[1]), totalLines) : Number(lineMatch[1])) : undefined;
  if (/No diagram type detected/i.test(detail)) {
    return { text: 'Não encontrei o tipo do diagrama. Comece a primeira linha com, por exemplo, "flowchart LR".', detail };
  }
  if (/Parse error|Syntax error|Expecting/i.test(detail)) {
    return { line, text: line ? `O Mermaid não entendeu a linha ${line}. Confira setas, colchetes e aspas.` : 'O Mermaid não entendeu este código. Confira setas, colchetes e aspas.', detail };
  }
  return { line, text: 'Não foi possível desenhar este código. Confira a sintaxe.', detail };
}
