'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { AlertTriangle, Braces, Check, CircleHelp, Download, FileText, GraduationCap, Image as ImageIcon, Layers, LoaderCircle, PencilRuler, XCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Modal } from '@/components/Modal';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useTheme } from '@/components/use-theme';
import { downloadFile, svgSize, svgToPng } from '@/lib/download';
import { defaultMermaidSource } from '@/lib/mermaid-examples';
import { lessonToMarkdown, markdownFileStem, mermaidToMarkdown } from '@/lib/markdown';
import { cssVar, themes } from '@/lib/theme';
import { catalog, type CatalogItem } from './catalog';
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
const LESSON_LAYOUTS: LessonLayout[] = ['linear', 'tree', 'tree-reverse'];
const MODES: Mode[] = ['manual', 'mermaid', 'teaching'];

type Saved = Partial<{ nodes: ShapeNode[]; edges: Edge[]; mermaidSource: string; generated: boolean; slides: Slide[]; boardTitle: string; mode: Mode; lessonLayout: LessonLayout }>;
type Initial = { raw: string; saved: Saved; template?: CatalogItem };
type Toast = { id: number; message: string };

const modeTabs: { id: Mode; label: string; hint: string; Icon: typeof PencilRuler }[] = [
  { id: 'manual', label: 'Quadro', hint: 'Arraste formas e ligue com setas.', Icon: PencilRuler },
  { id: 'mermaid', label: 'Código Mermaid', hint: 'Escreva o código e veja o desenho ao lado.', Icon: Braces },
  { id: 'teaching', label: 'Aula', hint: 'Apresente em sequência ou a partir de uma raiz.', Icon: GraduationCap },
];

const subscribeNothing = () => () => {};

function readInitial(): Initial {
  let raw = '';
  let saved: Saved = {};
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? '';
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') saved = parsed as Saved;
    }
  } catch {
    saved = {};
  }
  let template: CatalogItem | undefined;
  try {
    const wanted = new URLSearchParams(window.location.search).get('modelo');
    template = wanted ? catalog.find((entry) => entry.title === wanted) : undefined;
  } catch {
    template = undefined;
  }
  return { raw: template ? '' : raw, saved, template };
}

export default function StudioClient() {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!hydrated) {
    return (
      <div className="studio studio-loading" aria-busy="true">
        <header className="titlebar"><Logo /></header>
        <div className="studio-loading-body" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Abrindo o estúdio…</span>
        </div>
      </div>
    );
  }
  return <Studio />;
}

function Studio() {
  const theme = useTheme();
  const [initial] = useState(readInitial);
  const { saved, template } = initial;
  const [mode, setMode] = useState<Mode>(() => (template ? 'manual' : saved.mode && MODES.includes(saved.mode) ? saved.mode : 'manual'));
  const [boardTitle, setBoardTitle] = useState(() => template?.title ?? saved.boardTitle ?? 'Arquitetura de aplicação');
  const [slides, setSlides] = useState<Slide[]>(() => normalizeLessonSlides(saved.slides?.length ? saved.slides : initialSlides));
  const [lessonLayout, setLessonLayout] = useState<LessonLayout>(() => (saved.lessonLayout && LESSON_LAYOUTS.includes(saved.lessonLayout) ? saved.lessonLayout : 'linear'));
  const [slideIndex, setSlideIndex] = useState(0);
  const [mermaidSource, setMermaidSource] = useState(() => saved.mermaidSource || defaultMermaidSource);
  const [generated, setGenerated] = useState(() => (typeof saved.generated === 'boolean' ? saved.generated : false));
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [problemCount, setProblemCount] = useState(0);
  const [patternsOpen, setPatternsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(initial.raw);
  const [saveFailed, setSaveFailed] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ manual: null, mermaid: null, teaching: null });

  const notify = useCallback((message: string) => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const [boardStart] = useState(() => (template ? boardFromCatalog(template) : { nodes: saved.nodes, edges: saved.edges }));
  const board = useBoard(notify, boardStart);
  const { nodes, edges } = board;

  useEffect(() => {
    document.documentElement.setAttribute('data-hydrated', '1');
    if (template) window.history.replaceState(null, '', '/studio');
  }, [template]);

  const serialized = useMemo(
    () => JSON.stringify({ nodes, edges, mermaidSource, generated, slides, boardTitle, mode, lessonLayout } satisfies Saved),
    [nodes, edges, mermaidSource, generated, slides, boardTitle, mode, lessonLayout],
  );
  const saving = serialized !== savedSnapshot;

  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
        setSaveFailed(false);
      } catch {
        setSaveFailed(true);
      }
      setSavedSnapshot(serialized);
    }, 450);
    return () => clearTimeout(timer);
  }, [saving, serialized]);

  useEffect(() => {
    const flush = () => { try { localStorage.setItem(STORAGE_KEY, serialized); } catch {} };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [serialized]);

  const onGlobalKey = useEffectEvent((event: globalThis.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('[aria-modal="true"]')) return;
    if (event.key === '?' && !event.ctrlKey && !event.metaKey) { event.preventDefault(); setHelpOpen(true); }
  });
  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => onGlobalKey(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

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
  const saveLabel = saveFailed ? 'Não foi possível salvar' : saving ? 'Salvando…' : 'Salvo neste navegador';
  const SaveIcon = saveFailed ? AlertTriangle : saving ? LoaderCircle : Check;

  return (
    <div className="studio">
      <header className="titlebar">
        <Logo />
        <div className="doc-title">
          <input aria-label="Nome do diagrama" value={boardTitle} onChange={(event) => setBoardTitle(event.target.value)} />
          <span className={`saved${saving ? ' is-saving' : ''}${saveFailed ? ' is-error' : ''}`} role="status" aria-live="polite"><SaveIcon size={14} aria-hidden="true" /> <span>{saveLabel}</span></span>
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
          <button type="button" className="icon-btn" aria-label="Como usar o estúdio" title="Como usar (?)" onClick={() => setHelpOpen(true)}><CircleHelp size={17} aria-hidden="true" /></button>
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
            <Icon size={15} aria-hidden="true" /> <span>{label}</span>
          </button>
        ))}
        <span className="tabs-hint">{activeTab.hint}</span>
      </div>

      <div key={mode} className="tabpanel" role="tabpanel" id="studio-panel" aria-labelledby={`tab-${mode}`}>
        {mode === 'manual' && <ManualBoard board={board} boardTitle={boardTitle} onTitle={setBoardTitle} onNotify={notify} onGenerateMermaid={generateMermaid} />}
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
        <span className="status-item">{saveLabel}</span>
      </footer>

      <PatternLibrary open={patternsOpen} onClose={() => setPatternsOpen(false)} onChoose={choosePattern} />

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} titleId="help-title" title="Como usar o estúdio" description="Escolha uma aba e comece. Tudo é salvo sozinho neste navegador." closeLabel="Fechar ajuda" size="md">
        <div className="help-grid">
          <div>
            <h3>Quadro</h3>
            <p>Clique em uma forma à esquerda para adicioná-la ou dê dois cliques na folha. Arraste para mover, arraste o fundo para navegar e use Ctrl + roda do mouse para o zoom. Para ligar duas formas, use o botão Conectar e clique na origem e depois no destino.</p>
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
            <ul className="shortcut-list">
              <li><span>Desfazer</span><span><span className="kbd">Ctrl</span> <span className="kbd">Z</span></span></li>
              <li><span>Refazer</span><span><span className="kbd">Ctrl</span> <span className="kbd">Shift</span> <span className="kbd">Z</span></span></li>
              <li><span>Selecionar tudo</span><span><span className="kbd">Ctrl</span> <span className="kbd">A</span></span></li>
              <li><span>Duplicar</span><span><span className="kbd">Ctrl</span> <span className="kbd">D</span></span></li>
              <li><span>Remover</span><span><span className="kbd">Delete</span></span></li>
              <li><span>Comentar linhas</span><span><span className="kbd">Ctrl</span> <span className="kbd">/</span></span></li>
              <li><span>Abrir esta ajuda</span><span><span className="kbd">?</span></span></li>
              <li><span>Cancelar ou fechar</span><span><span className="kbd">Esc</span></span></li>
            </ul>
          </div>
        </div>
      </Modal>

      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div key={toast.id} className="toast"><Check size={14} aria-hidden="true" /><span>{toast.message}</span></div>}
      </div>
    </div>
  );
}
