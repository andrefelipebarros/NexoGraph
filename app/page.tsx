import Link from 'next/link';
import { Check } from 'lucide-react';
import { HeroDemo } from '@/components/landing/HeroDemo';
import { ModelsList } from '@/components/landing/ModelsList';
import { Workbench } from '@/components/landing/Workbench';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Logo } from '@/components/Logo';
import { catalog } from '@/app/studio/catalog';
import { designPatterns } from '@/app/studio/design-patterns';
import { GITHUB_URL } from '@/lib/site';

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="wrap nav-in">
          <Logo />
          <nav className="nav-links" aria-label="Seções da página">
            <a href="#como-funciona">Como funciona</a>
            <a href="#modelos">Modelos</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <div className="nav-right">
            <ThemeSwitcher />
            <Link href="/studio" className="btn btn-sm btn-primary">Abrir o estúdio</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <h1>Diagramas que você desenha, escreve e ensina.</h1>
          <div className="hero-side">
            <p>Monte caixas e setas com o mouse, escreva em Mermaid com cores que mostram a estrutura do código ou apresente uma aula começando pela raiz no topo e descendo pelos ramos.</p>
            <div className="hero-actions">
              <Link href="/studio" className="btn btn-lg btn-primary">Abrir o estúdio</Link>
              <a href="#como-funciona" className="btn btn-lg">Ver como funciona</a>
            </div>
            <ul className="hero-points">
              <li><Check size={15} aria-hidden="true" /> Funciona no navegador, sem conta</li>
              <li><Check size={15} aria-hidden="true" /> Rascunhos salvos neste computador</li>
              <li><Check size={15} aria-hidden="true" /> Exporta SVG, PNG e Markdown para GitHub</li>
            </ul>
          </div>
        </section>

        <section className="wrap" aria-label="Exemplo do editor">
          <HeroDemo />
          <p className="hero-caption">Passe o mouse sobre uma linha do código, uma seta ou uma caixa para ver a ligação entre o texto e o desenho.</p>
        </section>

        <section id="como-funciona" className="wrap section">
          <h2>Comece pelo jeito mais fácil para o que você quer fazer.</h2>
          <p className="section-lead">São três espaços no mesmo estúdio. Você pode trocar de um para outro a qualquer momento, e o quadro vira código Mermaid com um clique.</p>
          <Workbench />
        </section>

        <section id="modelos" className="wrap section">
          <h2>Comece de um modelo pronto.</h2>
          <p className="section-lead">Escolha um tipo de diagrama e o estúdio abre um quadro já montado para você editar. Na Aula, você também pode começar por uma raiz no topo, criar ramificações ou contar a história no sentido inverso. Se preferir, comece em branco.</p>
          <ModelsList items={catalog} />
          <p className="model-note">Mais {designPatterns.length} padrões de projeto (GoF, arquitetura e sistemas distribuídos) que abrem como diagrama ou como aula.</p>
        </section>

        <section className="wrap">
          <div className="cta">
            <div>
              <h2>Abra o estúdio. Já tem um exemplo esperando.</h2>
              <p>Edite o exemplo, apague tudo ou comece de um modelo da biblioteca.</p>
            </div>
            <Link href="/studio" className="btn btn-lg btn-primary">Abrir o estúdio</Link>
          </div>
        </section>
      </main>

      <footer className="statusbar footbar">
        <span className="status-item">NexoGraph 0.5</span>
        <span className="status-item">Protótipo local, sem conta</span>
        <a className="status-item push" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </>
  );
}
