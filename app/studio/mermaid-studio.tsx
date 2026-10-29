'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Copy, Download, FileCode2, Image as ImageIcon, Maximize2, Minus, Plus, Undo2, XCircle } from 'lucide-react';
import { CodeEditor, type CodeEditorHandle } from '@/components/CodeEditor';
import { Modal } from '@/components/Modal';
import { useTheme } from '@/components/use-theme';
import { downloadFile, svgSize, svgToPng } from '@/lib/download';
import { markdownFileStem, mermaidToMarkdown } from '@/lib/markdown';
import { highlightMermaid, parseMermaidError, type Problem } from '@/lib/mermaid-highlight';
import { mermaidExamples, mermaidSnippets } from '@/lib/mermaid-examples';
import { cssVar, isDarkTheme } from '@/lib/theme';

type Props = {
  title: string;
  source: string;
  onSourceChange: (source: string) => void;
  onExample: (source: string) => void;
  generatedFromCanvas: boolean;
  onBackToBoard: () => void;
  onNotify: (message: string) => void;
  onCursor: (line: number, col: number) => void;
  onProblemCount: (count: number) => void;
};

type RenderState = 'idle' | 'rendering' | 'ok' | 'error';

let renderCounter = 0;

export function MermaidStudio({ title, source, onSourceChange, onExample, generatedFromCanvas, onBackToBoard, onNotify, onCursor, onProblemCount }: Props) {
  const theme = useTheme();
  const editorRef = useRef<CodeEditorHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [svg, setSvg] = useState('');
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [mermaidProblem, setMermaidProblem] = useState<{ line?: number; text: string; detail: string } | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [problemsOpen, setProblemsOpen] = useState(true);
  const [noteOpen, setNoteOpen] = useState(true);
  const [pendingExample, setPendingExample] = useState<string | null>(null);

  const highlighted = useMemo(() => highlightMermaid(source), [source]);

  const problems = useMemo<Problem[]>(() => {
    const list = [...highlighted.problems];
    if (mermaidProblem && !list.some((item) => item.line === mermaidProblem.line)) {
      list.push({ line: mermaidProblem.line ?? 1, col: 1, severity: 'error', source: 'mermaid', message: mermaidProblem.text });
    }
    return list.sort((a, b) => a.line - b.line || a.col - b.col);
  }, [highlighted.problems, mermaidProblem]);
  const errorLines = useMemo(() => problems.map((item) => item.line), [problems]);

  useEffect(() => { onProblemCount(problems.length); }, [problems.length, onProblemCount]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setRenderState('rendering');
      try {
        const mermaid = (await import('mermaid')).default;
        const dark = isDarkTheme(theme);
        const v = (name: string) => cssVar(name);
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: 'base',
          fontFamily: 'Schibsted Grotesk Variable, system-ui, sans-serif',
          flowchart: { htmlLabels: false, curve: 'basis' },
          themeVariables: {
            darkMode: dark,
            background: v('--bg'),
            fontFamily: 'Schibsted Grotesk Variable, system-ui, sans-serif',
            primaryColor: v('--bg-raise'),
            primaryTextColor: v('--fg'),
            primaryBorderColor: v('--br3'),
            secondaryColor: v('--bg-hover'),
            secondaryTextColor: v('--fg'),
            secondaryBorderColor: v('--border-strong'),
            tertiaryColor: v('--bg-side'),
            tertiaryTextColor: v('--fg'),
            mainBkg: v('--bg-raise'),
            nodeBorder: v('--br3'),
            lineColor: v('--ar-solid'),
            textColor: v('--fg'),
            edgeLabelBackground: v('--bg'),
            clusterBkg: v('--bg-side'),
            clusterBorder: v('--border-strong'),
            titleColor: v('--fg'),
            noteBkgColor: v('--bg-hover'),
            noteTextColor: v('--fg'),
            noteBorderColor: v('--br1'),
            actorBkg: v('--bg-raise'),
            actorBorder: v('--br3'),
            actorTextColor: v('--fg'),
            actorLineColor: v('--border-strong'),
            signalColor: v('--ar-solid'),
            signalTextColor: v('--fg'),
            labelBoxBkgColor: v('--bg-raise'),
            labelBoxBorderColor: v('--br2'),
            labelTextColor: v('--fg'),
            loopTextColor: v('--fg'),
            activationBkgColor: v('--bg-hover'),
            activationBorderColor: v('--br2'),
            classText: v('--fg'),
            relationColor: v('--ar-solid'),
            relationLabelBackground: v('--bg'),
            attributeBackgroundColorOdd: v('--bg-raise'),
            attributeBackgroundColorEven: v('--bg-hover'),
            transitionColor: v('--ar-solid'),
            stateBkg: v('--bg-raise'),
            stateLabelColor: v('--fg'),
            altBackground: v('--bg-side'),
          },
        });
        const id = `nexograph-mmd-${(renderCounter += 1)}`;
        try {
          const result = await mermaid.render(id, source);
          if (cancelled) return;
          setSvg(result.svg);
          setMermaidProblem(null);
          setRenderState('ok');
        } finally {
          document.getElementById(id)?.remove();
          document.getElementById(`d${id}`)?.remove();
        }
      } catch (error) {
        if (cancelled) return;
        setMermaidProblem(parseMermaidError(error instanceof Error ? error.message : String(error), source.split('\n').length));
        setRenderState('error');
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [source, theme]);

  const natural = useMemo(() => (svg ? svgSize(svg) : { width: 600, height: 300 }), [svg]);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(source); onNotify('Código copiado'); }
    catch { onNotify('Não deu para copiar sozinho. Selecione o código e use Ctrl+C.'); }
  };

  const exportableSvg = () => {
    const { width, height } = natural;
    const bg = cssVar('--bg', '#ffffff');
    return svg
      .replace(/<svg([^>]*?)\sstyle="[^"]*"/, '<svg$1')
      .replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1')
      .replace('<svg', `<svg width="${width}" height="${height}" style="background:${bg}"`);
  };
  const exportSvg = () => { if (!svg) { onNotify('Nada para exportar ainda'); return; } downloadFile('diagrama.svg', exportableSvg(), 'image/svg+xml;charset=utf-8'); onNotify('SVG baixado'); };
  const exportPng = async () => {
    if (!svg) { onNotify('Nada para exportar ainda'); return; }
    try {
      const blob = await svgToPng(exportableSvg(), natural.width, natural.height, cssVar('--bg', '#ffffff'));
      downloadFile('diagrama.png', blob);
      onNotify('PNG baixado');
    } catch { onNotify('Não foi possível gerar o PNG. Tente o SVG.'); }
  };
  const exportMarkdown = () => {
    if (!source.trim()) { onNotify('Adicione código Mermaid antes de exportar.'); return; }
    downloadFile(`${markdownFileStem(title, 'diagrama')}.md`, mermaidToMarkdown(title, source), 'text/markdown;charset=utf-8');
    onNotify('Markdown (.md) pronto para o GitHub');
  };

  const applyExample = (exampleSource: string) => {
    setPendingExample(null);
    onExample(exampleSource);
    requestAnimationFrame(() => editorRef.current?.focus());
  };
  const loadExample = (exampleSource: string) => {
    if (exampleSource === source) return;
    const isKnown = mermaidExamples.some((item) => item.source === source);
    if (source.trim() && !isKnown) { setPendingExample(exampleSource); return; }
    applyExample(exampleSource);
  };
  const copyBeforeReplacing = async () => {
    await copyCode();
    if (pendingExample) applyExample(pendingExample);
  };

  const onPanStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage || event.button !== 0) return;
    panRef.current = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    stage.setPointerCapture(event.pointerId);
  };
  const onPanMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current; const stage = stageRef.current;
    if (!pan || !stage) return;
    stage.scrollLeft = pan.left - (event.clientX - pan.x);
    stage.scrollTop = pan.top - (event.clientY - pan.y);
  };
  const onPanEnd = () => { panRef.current = null; };

  const stepZoom = (delta: number) => setZoom((current) => Math.min(3, Math.max(0.25, Math.round(((current ?? 1) + delta) * 100) / 100)));

  const onStageWheel = useEffectEvent((event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    stepZoom(event.deltaY < 0 ? 0.1 : -0.1);
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const listener = (event: WheelEvent) => onStageWheel(event);
    stage.addEventListener('wheel', listener, { passive: false });
    return () => stage.removeEventListener('wheel', listener);
  }, []);

  const stateLabel = renderState === 'rendering' ? 'Desenhando…' : renderState === 'ok' ? 'Atualizado' : renderState === 'error' ? (svg ? 'Mostrando a última versão válida' : 'Sem desenho ainda') : 'Preparando…';

  return (
    <div className="mm">
      <aside className="mm-side" aria-label="Ajuda do editor Mermaid">
        <section className="mm-block">
          <h2 className="mm-title">Exemplos</h2>
          <ul>
            {mermaidExamples.map((example) => (
              <li key={example.id}>
                <button type="button" className={`mm-example${example.source === source ? ' is-active' : ''}`} onClick={() => loadExample(example.source)}>
                  <strong>{example.label}</strong>
                  <small>{example.description}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="mm-block">
          <h2 className="mm-title">Inserir no cursor</h2>
          <div className="mm-snippets">
            {mermaidSnippets.map((snippet) => (
              <button key={snippet.label} type="button" className="mm-snippet" title={snippet.hint} onClick={() => editorRef.current?.insert(snippet.text, { newLine: snippet.text.includes('\n') || snippet.text.startsWith('%%') })}>
                {snippet.label}
              </button>
            ))}
          </div>
        </section>
        <section className="mm-block">
          <h2 className="mm-title">Como ler as cores</h2>
          <p className="mm-help">A cada nível de aninhamento, os colchetes mudam de cor. O par que fecha tem a cor de quem abriu.</p>
          <pre className="mm-legend"><span className="tk-b0">(</span><span className="tk-b1">[</span><span className="tk-b2">{'{'}</span> nível 1, 2 e 3{'\n'}<span className="tk-b2">{'}'}</span><span className="tk-b1">]</span><span className="tk-b0">)</span> fecham na ordem{'\n'}<span className="tk-bad">]</span> sem par ou fora de lugar</pre>
          <ul className="mm-arrows">
            <li><code className="tk-arrow-solid">--&gt;</code><span>contínua: fluxo normal</span></li>
            <li><code className="tk-arrow-dotted">-.-&gt;</code><span>tracejada: opcional</span></li>
            <li><code className="tk-arrow-thick">==&gt;</code><span>grossa: caminho principal</span></li>
            <li><code className="tk-arrow-plain">---</code><span>simples: só liga, sem direção</span></li>
          </ul>
        </section>
        <section className="mm-block">
          <h2 className="mm-title">Atalhos</h2>
          <ul className="mm-keys">
            <li><span className="kbd">Tab</span> recuar linhas</li>
            <li><span className="kbd">Shift</span> + <span className="kbd">Tab</span> desfazer recuo</li>
            <li><span className="kbd">Ctrl</span> + <span className="kbd">/</span> comentar linhas</li>
            <li><span className="kbd">Ctrl</span> + <span className="kbd">Z</span> desfazer</li>
          </ul>
        </section>
      </aside>

      <section className="mm-pane mm-editor" aria-label="Código Mermaid">
        <div className="mm-tabs">
          <div className="mm-file"><FileCode2 size={14} aria-hidden="true" /> diagrama.mmd</div>
          <div className="mm-actions">
            <button type="button" className="btn btn-sm" onClick={copyCode}><Copy size={13} aria-hidden="true" /> Copiar</button>
            <button type="button" className="btn btn-sm" onClick={exportMarkdown} title="Baixar um .md com o diagrama Mermaid pronto para o GitHub"><Download size={13} aria-hidden="true" /> Markdown (.md)</button>
          </div>
        </div>
        {generatedFromCanvas && noteOpen && (
          <div className="mm-note" role="note">
            <div>
              <strong>Código gerado a partir do seu quadro.</strong> Ele mostra caixas e setas como um fluxograma. Mudanças feitas aqui não voltam para o quadro.
              <details>
                <summary>O que muda do quadro para o Mermaid</summary>
                <p>O Mermaid refaz a posição e o tamanho dos elementos sozinho. Formas sem equivalente exato viram a mais parecida, e o conversor não cria diagramas de classes ou de sequência.</p>
              </details>
            </div>
            <div className="mm-note-actions">
              <button type="button" className="btn btn-sm" onClick={onBackToBoard}><Undo2 size={13} aria-hidden="true" /> Voltar ao quadro</button>
              <button type="button" className="icon-btn" aria-label="Fechar aviso" onClick={() => setNoteOpen(false)}><XCircle size={15} aria-hidden="true" /></button>
            </div>
          </div>
        )}
        <div className="mm-code">
          <CodeEditor ref={editorRef} value={source} onChange={onSourceChange} highlighted={highlighted} errorLines={errorLines} ariaLabel="Código Mermaid" placeholder="Escreva aqui. Por exemplo: flowchart LR" onCursor={onCursor} />
        </div>
        <div className="mm-problems">
          <button type="button" className="mm-problems-head" aria-expanded={problemsOpen} onClick={() => setProblemsOpen((open) => !open)}>
            {problemsOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
            <span>Problemas</span>
            <span className={`mm-count${problems.length ? ' has-error' : ''}`}>{problems.length}</span>
          </button>
          {problemsOpen && (
            <div className="mm-problems-body">
              {problems.length === 0 && <p className="mm-ok"><CheckCircle2 size={14} aria-hidden="true" /> Colchetes em ordem e código aceito pelo Mermaid.</p>}
              {problems.map((problem, index) => (
                <button key={`${problem.line}-${problem.col}-${index}`} type="button" className="mm-problem" onClick={() => editorRef.current?.goToLine(problem.line)}>
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{problem.message}</span>
                  <code>linha {problem.line}</code>
                </button>
              ))}
              {mermaidProblem && (
                <details className="mm-detail">
                  <summary>Detalhes técnicos do Mermaid</summary>
                  <pre>{mermaidProblem.detail}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mm-pane mm-preview" aria-label="Pré-visualização do diagrama">
        <div className="mm-tabs">
          <div className="mm-file"><span className={`mm-dot is-${renderState}`} aria-hidden="true" /> {stateLabel}</div>
          <div className="mm-actions">
            <button type="button" className="icon-btn" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => stepZoom(-0.25)}><Minus size={14} aria-hidden="true" /></button>
            <button type="button" className="btn btn-sm mm-zoom" title="Ajustar à janela" onClick={() => setZoom(null)}>{zoom === null ? <><Maximize2 size={12} aria-hidden="true" /> Ajustar</> : `${Math.round(zoom * 100)}%`}</button>
            <button type="button" className="icon-btn" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => stepZoom(0.25)}><Plus size={14} aria-hidden="true" /></button>
            <span className="mm-sep" aria-hidden="true" />
            <button type="button" className="btn btn-sm" onClick={exportSvg}><Download size={13} aria-hidden="true" /> SVG</button>
            <button type="button" className="btn btn-sm" onClick={exportPng}><ImageIcon size={13} aria-hidden="true" /> PNG</button>
          </div>
        </div>
        <div className="mm-stage" ref={stageRef} onPointerDown={onPanStart} onPointerMove={onPanMove} onPointerUp={onPanEnd} onPointerCancel={onPanEnd}>
          {svg ? (
            <div
              className={`mm-svg${renderState === 'error' ? ' is-stale' : ''}`}
              style={zoom === null ? { width: '100%', maxWidth: natural.width * 1.5 } : { width: natural.width * zoom }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="mm-empty">
              <p><strong>O desenho aparece aqui.</strong></p>
              <p>Escolha um exemplo à esquerda ou escreva a primeira linha, como <code>flowchart LR</code>.</p>
            </div>
          )}
        </div>
        <div className="mm-foot">Arraste para mover o desenho. Use os botões acima ou Ctrl + roda do mouse para o zoom.</div>
      </section>
      <Modal
        open={pendingExample !== null}
        onClose={() => setPendingExample(null)}
        titleId="replace-code-title"
        title="Trocar o código pelo exemplo?"
        description="O código atual será substituído. Copie antes se quiser guardar uma cópia."
        closeLabel="Cancelar"
        size="md"
        footer={(
          <>
            <button type="button" className="btn btn-sm" onClick={() => setPendingExample(null)}>Cancelar</button>
            <div className="modal-foot-actions">
              <button type="button" className="btn btn-sm" onClick={copyBeforeReplacing}><Copy size={13} aria-hidden="true" /> Copiar e trocar</button>
              <button type="button" className="btn btn-sm btn-primary" data-autofocus onClick={() => pendingExample && applyExample(pendingExample)}>Trocar pelo exemplo</button>
            </div>
          </>
        )}
      >
        <div className="modal-body"><pre className="modal-preview">{source.split('\n').slice(0, 8).join('\n')}{source.split('\n').length > 8 ? '\n…' : ''}</pre></div>
      </Modal>
    </div>
  );
}
