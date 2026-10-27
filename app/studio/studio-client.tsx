'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Braces, Check, CircleHelp, Download, FileText, GraduationCap, Image as ImageIcon, Layers, PencilRuler, X, XCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useTheme } from '@/components/use-theme';
import { downloadFile, svgSize, svgToPng } from '@/lib/download';
import { defaultMermaidSource } from '@/lib/mermaid-examples';
import { lessonToMarkdown, markdownFileStem, mermaidToMarkdown } from '@/lib/markdown';
import { cssVar, themes } from '@/lib/theme';
import { catalog } from './catalog';
import type { DesignPattern } from './design-patterns';
import { ManualBoard } from './manual-board';
import { MermaidStudio } from './mermaid-studio';
import { PatternLibrary } from './pattern-library';
import { TeachingBoard } from './teaching-board';
import { boardFromCatalog, boardFromPattern, lessonFromPattern } from './templates';
import { generateMermaidFromCanvas, initialSlides, normalizeLessonSlides, svgForDiagram } from './types';
import type { CanvasColors, Edge, LessonLayout, Mode, ShapeNode, Slide } from './types';
import { useBoard } from './use-board';

const STORAGE_KEY = 'nexograph-studio-v2';

type Saved = Partial<{ nodes: ShapeNode[]; edges: Edge[]; mermaidSource: string; generated: boolean; slides: Slide[]; boardTitle: string; mode: Mode; lessonLayout: LessonLayout }>;

const modeTabs: { id: Mode; label: string; hint: string; Icon: typeof PencilRuler }[] = [
  { id: 'manual', label: 'Quadro', hint: 'Arraste formas e ligue com setas.', Icon: PencilRuler },
  { id: 'mermaid', label: 'Código Mermaid', hint: 'Escreva o código e veja o desenho ao lado.', Icon: Braces },
  { id: 'teaching', label: 'Aula', hint: 'Apresente em sequência ou a partir de uma raiz.', Icon: GraduationCap },
];

export default function StudioClient() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('manual');
  const [boardTitle, setBoardTitle] = useState('Arquitetura de aplicação');
  const [slides, setSlides] = useState<Slide[]>(() => normalizeLessonSlides(initialSlides));
  const [lessonLayout, setLessonLayout] = useState<LessonLayout>('linear');
  const [slideIndex, setSlideIndex] = useState(0);
  const [mermaidSource, setMermaidSource] = useState(defaultMermaidSource);
  const [generated, setGenerated] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [problemCount, setProblemCount] = useState(0);
  const [patternsOpen, setPatternsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [loaded, setLoaded] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ manual: null, mermaid: null, teaching: null });

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const board = useBoard(notify);
  const { setNodes, setEdges, nodes, edges } = board;

  // O localStorage só existe no navegador, então o que foi salvo é lido depois de montar.
  // Ler no primeiro render deixaria o HTML do servidor diferente do HTML do cliente.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        if (saved.nodes) setNodes(saved.nodes);
        if (saved.edges) setEdges(saved.edges);
        if (saved.mermaidSource) setMermaidSource(saved.mermaidSource);
        if (typeof saved.generated === 'boolean') setGenerated(saved.generated);
        if (saved.slides?.length) setSlides(normalizeLessonSlides(saved.slides));
        if (saved.lessonLayout === 'linear' || saved.lessonLayout === 'tree' || saved.lessonLayout === 'tree-reverse') setLessonLayout(saved.lessonLayout);
        if (saved.boardTitle) setBoardTitle(saved.boardTitle);
        if (saved.mode === 'manual' || saved.mode === 'mermaid' || saved.mode === 'teaching') setMode(saved.mode);
      }
    } catch { /* dados antigos ou inválidos: começa do exemplo */ }
    try {
      const wanted = new URLSearchParams(window.location.search).get('modelo');
      const item = wanted ? catalog.find((entry) => entry.title === wanted) : undefined;
      if (item) {
        const next = boardFromCatalog(item);
        setNodes(next.nodes);
        setEdges(next.edges);
        setBoardTitle(item.title);
        setMode('manual');
        window.history.replaceState(null, '', '/studio');
      }
    } catch { /* sem acesso à URL */ }
    document.documentElement.setAttribute('data-hydrated', '1');
    setLoaded(true);
  }, [setNodes, setEdges]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!loaded) return;
    try {
      const data: Saved = { nodes, edges, mermaidSource, generated, slides, boardTitle, mode, lessonLayout };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* armazenamento cheio ou bloqueado */ }
  }, [loaded, nodes, edges, mermaidSource, generated, slides, boardTitle, mode, lessonLayout]);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setHelpOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen]);

  const onCursor = useCallback((line: number, col: number) => {
    setCursor((current) => (current.line === line && current.col === col ? current : { line, col }));
  }, []);

  const canvasColors = (): CanvasColors => ({
    bg: cssVar('--bg', '#1e1e1e'),
    raise: cssVar('--bg-node', '#2d2d30'),
    fg: cssVar('--fg-strong', '#ffffff'),
    dim: cssVar('--fg-dim', '#a0a0a0'),
    edge: cssVar('--ar-solid', '#4ec9b0'),
    mono: theme === 'mono',
  });

  const exportBoard = async (kind: 'svg' | 'png') => {
    if (!nodes.length) { notify('O quadro está vazio. Adicione elementos antes de exportar.'); return; }
    const colors = canvasColors();
    const svg = svgForDiagram(nodes, edges, colors);
    if (kind === 'svg') { downloadFile('diagrama.svg', svg, 'image/svg+xml;charset=utf-8'); notify('SVG baixado'); return; }
    try {
      const { width, height } = svgSize(svg);
      downloadFile('diagrama.png', await svgToPng(svg, width, height, colors.bg));
      notify('PNG baixado');
    } catch { notify('Não foi possível gerar o PNG. Tente o SVG.'); }
  };

  const generateMermaid = () => {
    if (!nodes.length) { notify('Adicione formas ao quadro antes de gerar o código.'); return; }
    setMermaidSource(generateMermaidFromCanvas(nodes, edges, canvasColors()));
    setGenerated(true);
    setMode('mermaid');
    notify('Código gerado a partir do quadro');
  };

  const exportBoardMarkdown = () => {
    if (!nodes.length) { notify('O quadro está vazio. Adicione elementos antes de exportar.'); return; }
    const source = generateMermaidFromCanvas(nodes, edges, canvasColors());
    const markdown = mermaidToMarkdown(boardTitle, source);
    downloadFile(`${markdownFileStem(boardTitle, 'diagrama')}.md`, markdown, 'text/markdown;charset=utf-8');
    notify('Markdown (.md) pronto para o GitHub');
  };

  const choosePattern = (pattern: DesignPattern, target: 'manual' | 'teaching') => {
    board.replaceBoard(boardFromPattern(pattern));
    setBoardTitle(pattern.name);
    if (target === 'teaching') {
      setSlides(normalizeLessonSlides(lessonFromPattern(pattern)));
      setLessonLayout('linear');
      setSlideIndex(0);
      setMode('teaching');
      notify(`Aula de "${pattern.name}" criada`);
    } else {
      setMode('manual');
      notify(`"${pattern.name}" aberto no quadro. Use Desfazer para voltar.`);
    }
    setPatternsOpen(false);
  };

  const exportLesson = () => {
    const markdown = lessonToMarkdown(boardTitle, lessonLayout, slides);
    downloadFile(`${markdownFileStem(boardTitle, 'roteiro')}.md`, markdown, 'text/markdown;charset=utf-8');
    notify('Roteiro Markdown (.md) baixado');
  };

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = modeTabs.findIndex((tab) => tab.id === mode);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % modeTabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + modeTabs.length) % modeTabs.length;
    else return;
    event.preventDefault();
    setMode(modeTabs[next].id);
    tabRefs.current[modeTabs[next].id]?.focus();
  };

  const themeLabel = themes.find((item) => item.id === theme)?.label ?? 'Grafite';
  const activeTab = modeTabs.find((tab) => tab.id === mode) ?? modeTabs[0];

  return (
    <div className="studio">
      <header className="titlebar">
        <Logo />
        <div className="doc-title">
          <input aria-label="Nome do diagrama" value={boardTitle} onChange={(event) => setBoardTitle(event.target.value)} />
          <span className="saved"><Check size={14} aria-hidden="true" /> <span>Salvo neste navegador</span></span>
        </div>
        <div className="titlebar-actions">
          {mode === 'manual' && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => exportBoard('svg')} title="Baixar o quadro como SVG"><Download size={13} aria-hidden="true" /> <span className="btn-label">SVG</span></button>
              <button type="button" className="btn btn-sm" onClick={() => exportBoard('png')} title="Baixar o quadro como PNG"><ImageIcon size={13} aria-hidden="true" /> <span className="btn-label">PNG</span></button>
              <button type="button" className="btn btn-sm" onClick={exportBoardMarkdown} title="Baixar um Markdown (.md) com o diagrama pronto para o GitHub"><FileText size={13} aria-hidden="true" /> <span className="btn-label">Markdown</span></button>
            </>
          )}
          <button type="button" className="btn btn-sm" onClick={() => setPatternsOpen(true)} title="Abrir a biblioteca de Design Patterns"><Layers size={13} aria-hidden="true" /> <span className="btn-label">Design Patterns</span></button>
          <button type="button" className="icon-btn" aria-label="Como usar o estúdio" title="Como usar" onClick={() => setHelpOpen(true)}><CircleHelp size={17} aria-hidden="true" /></button>
          <ThemeSwitcher compact />
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Como você quer criar" onKeyDown={onTabKey}>
        {modeTabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            ref={(node) => { tabRefs.current[id] = node; }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            className="tab"
            aria-selected={mode === id}
            aria-controls="studio-panel"
            tabIndex={mode === id ? 0 : -1}
            onClick={() => setMode(id)}
          >
            <Icon size={15} aria-hidden="true" /> {label}
          </button>
        ))}
        <span className="tabs-hint">{activeTab.hint}</span>
      </div>

      <div className="tabpanel" role="tabpanel" id="studio-panel" aria-labelledby={`tab-${mode}`}>
        {mode === 'manual' && <ManualBoard board={board} boardTitle={boardTitle} onTitle={setBoardTitle} onNotify={notify} onGenerateMermaid={generateMermaid} ready={loaded} />}
        {mode === 'mermaid' && (
          <MermaidStudio
            title={boardTitle}
            source={mermaidSource}
            onSourceChange={(value) => { setMermaidSource(value); }}
            onExample={(value) => { setGenerated(false); setMermaidSource(value); }}
            generatedFromCanvas={generated}
            onBackToBoard={() => setMode('manual')}
            onNotify={notify}
            onCursor={onCursor}
            onProblemCount={setProblemCount}
          />
        )}
        {mode === 'teaching' && (
          <TeachingBoard title={boardTitle} slides={slides} setSlides={setSlides} index={slideIndex} setIndex={setSlideIndex} layout={lessonLayout} setLayout={setLessonLayout} onNotify={notify} onOpenPatterns={() => setPatternsOpen(true)} onExport={exportLesson} />
        )}
      </div>

      <footer className="statusbar" aria-label="Barra de status">
        {mode === 'manual' && (
          <>
            <span className="status-item">Quadro</span>
            <span className="status-item">{nodes.length} {nodes.length === 1 ? 'elemento' : 'elementos'}</span>
            <span className="status-item">{edges.length} {edges.length === 1 ? 'seta' : 'setas'}</span>
            {board.connecting && <span className="status-item">Conectando</span>}
          </>
        )}
        {mode === 'mermaid' && (
          <>
            <span className="status-item">Código Mermaid</span>
            <span className="status-item">Ln {cursor.line}, Col {cursor.col}</span>
            <span className={`status-item${problemCount > 0 ? ' has-error' : ''}`}><XCircle size={12} aria-hidden="true" /> {problemCount} {problemCount === 1 ? 'problema' : 'problemas'}</span>
          </>
        )}
        {mode === 'teaching' && (
          <>
            <span className="status-item">Aula</span>
            <span className="status-item">Bloco {slideIndex + 1} de {slides.length}</span>
            <span className="status-item">{lessonLayout === 'linear' ? 'Sequência' : lessonLayout === 'tree-reverse' ? 'Fluxo invertido' : 'Raiz'}</span>
          </>
        )}
        <span className="status-item push">{themeLabel}</span>
        <span className="status-item">Salvo neste navegador</span>
      </footer>

      <PatternLibrary open={patternsOpen} onClose={() => setPatternsOpen(false)} onChoose={choosePattern} />

      {helpOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <header className="modal-head">
              <div>
                <h2 id="help-title">Como usar o estúdio</h2>
                <p>Escolha uma aba e comece. Tudo é salvo sozinho neste navegador.</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Fechar ajuda" autoFocus onClick={() => setHelpOpen(false)}><X size={18} aria-hidden="true" /></button>
            </header>
            <div className="help-grid">
              <div>
                <h3>Quadro</h3>
                <p>Clique em uma forma à esquerda para adicioná-la. Arraste para mover e dê dois cliques para editar o texto. Para ligar duas formas, use o botão Conectar e clique na origem e depois no destino.</p>
              </div>
              <div>
                <h3>Código Mermaid</h3>
                <p>Escreva o diagrama como texto. Cada nível de colchetes ganha uma cor e cada tipo de seta tem a sua. Erros aparecem em vermelho e no painel Problemas. O botão Gerar código Mermaid, no quadro, transforma o seu desenho em código.</p>
              </div>
              <div>
                <h3>Aula</h3>
                <p>Organize os blocos em sequência ou no modo Raiz: o primeiro bloco fica no topo e os próximos descem em ramificações. Escolha o bloco pai, crie raízes independentes ou use o fluxo invertido para contar uma história no sentido oposto. A apresentação em tela cheia acompanha a mesma organização.</p>
              </div>
              <div>
                <h3>Atalhos</h3>
                <ul>
                  <li><span className="kbd">Ctrl</span> + <span className="kbd">Z</span> desfaz no quadro e no código</li>
                  <li><span className="kbd">Delete</span> remove o que está selecionado</li>
                  <li><span className="kbd">Ctrl</span> + <span className="kbd">D</span> duplica o elemento</li>
                  <li><span className="kbd">Ctrl</span> + <span className="kbd">/</span> comenta linhas no código</li>
                  <li><span className="kbd">Esc</span> cancela uma ligação ou fecha este painel</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
