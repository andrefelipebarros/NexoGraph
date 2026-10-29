import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import './globals.css';
import { themeInitScript } from '@/lib/theme';

const description = 'Monte diagramas com o mouse, escreva Mermaid em um editor com colchetes coloridos ou explique um bloco por vez em uma aula.';

export const metadata: Metadata = {
  title: { default: 'NexoGraph: diagramas para desenhar, escrever e ensinar', template: '%s · NexoGraph' },
  description,
  applicationName: 'NexoGraph',
  keywords: ['diagramas', 'Mermaid', 'UML', 'BPMN', 'C4', 'Design Patterns', 'quadro', 'aula'],
  openGraph: { title: 'NexoGraph', description, type: 'website', locale: 'pt_BR' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1e1e1e' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="grafite" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
