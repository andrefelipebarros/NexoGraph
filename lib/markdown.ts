import type { LessonLayout, Slide } from '@/app/studio/types';

/** Converts a user-facing title into a safe, readable download filename. */
export function markdownFileStem(value: string, fallback = 'nexograph') {
  const stem = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem || fallback;
}

function singleLine(value: string, fallback = '') {
  return value.replace(/[\r\n]+/g, ' ').trim() || fallback;
}

function mermaidLabel(value: string, fallback: string) {
  // Mermaid flowchart labels are quoted; neutralize delimiters that could break the label.
  return singleLine(value, fallback)
    .replace(/\\/g, '/')
    .replace(/"/g, "'")
    .replace(/\|/g, '/');
}

function chooseFence(source: string) {
  if (!source.includes('`````')) return source.includes('````') ? '`````' : source.includes('```') ? '````' : '```';
  return '``````';
}

/** Wraps Mermaid source in a GitHub-Flavored Markdown document. */
export function mermaidToMarkdown(title: string, source: string) {
  const heading = singleLine(title, 'Diagrama NexoGraph');
  const code = source.trim();
  const fence = chooseFence(code);
  return `# ${heading}\n\n> Diagrama criado com o NexoGraph. O bloco Mermaid abaixo pode ser renderizado diretamente no GitHub.\n\n## Diagrama\n\n${fence}mermaid\n${code}\n${fence}\n`;
}

function lessonDiagram(layout: LessonLayout, slides: Slide[]) {
  const direction = layout === 'tree' ? 'TD' : layout === 'tree-reverse' ? 'RL' : 'LR';
  const ids = new Map(slides.map((slide, index) => [slide.id, `B${index + 1}`]));
  const lines = [
    `flowchart ${direction}`,
    '  %% Diagrama gerado pelo NexoGraph',
    ...slides.map((slide, index) => `  B${index + 1}["${mermaidLabel(slide.title, `Bloco ${index + 1}`)}"]`),
  ];

  if (layout === 'linear') {
    for (let index = 1; index < slides.length; index += 1) {
      lines.push(`  B${index} --> B${index + 1}`);
    }
  } else {
    slides.forEach((slide, index) => {
      const parentId = slide.parentId ?? null;
      const parentIndex = parentId ? slides.findIndex((candidate) => candidate.id === parentId) : -1;
      // Match the on-screen layout: invalid/self/future parent links are treated as roots.
      if (parentIndex >= 0 && parentIndex < index) {
        lines.push(`  ${ids.get(parentId!)} --> ${ids.get(slide.id)}`);
      }
    });
  }
  return lines.join('\n');
}

/** Exports the entire lesson as Markdown, including an embeddable Mermaid diagram and block notes. */
export function lessonToMarkdown(title: string, layout: LessonLayout, slides: Slide[]) {
  const heading = singleLine(title, 'Aula NexoGraph');
  const layoutName = layout === 'tree' ? 'Raiz (topo para baixo)' : layout === 'tree-reverse' ? 'Invertida (direita para esquerda)' : 'Sequência';
  const diagram = lessonDiagram(layout, slides);
  const fence = chooseFence(diagram);
  const byId = new Map(slides.map((slide) => [slide.id, slide]));
  const content = slides.map((slide, index) => {
    const parts = [`### ${index + 1}. ${singleLine(slide.title, `Bloco ${index + 1}`)}`];
    if (slide.subtitle.trim()) parts.push(slide.subtitle.trim());
    const parentId = slide.parentId ?? null;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (layout !== 'linear' && parent && parent.id !== slide.id) parts.push(`- **Deriva de:** ${singleLine(parent.title, 'Bloco sem título')}`);
    const bullets = slide.bullets.map((item) => item.trim()).filter(Boolean);
    if (bullets.length) parts.push(bullets.map((item) => `- ${item}`).join('\n'));
    return parts.join('\n\n');
  }).join('\n\n');

  return `# ${heading}\n\n> Roteiro visual exportado do NexoGraph. Organização: **${layoutName}**.\n\n## Diagrama\n\n${fence}mermaid\n${diagram}\n${fence}\n\n## Conteúdo da aula\n\n${content}\n`;
}
