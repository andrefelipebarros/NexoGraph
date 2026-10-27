import type { Metadata } from 'next';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import './globals.css';
import { themeInitScript } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'NexoGraph: diagramas para desenhar, escrever e ensinar',
  description: 'Monte diagramas com o mouse, escreva Mermaid em um editor com colchetes coloridos ou explique um bloco por vez em uma aula.',
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
