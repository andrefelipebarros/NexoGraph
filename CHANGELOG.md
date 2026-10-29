# Changelog

## 0.6.0

### Novidades

- Zoom do quadro de 40% a 200%, por botões, `Ctrl` + roda do mouse e `Ctrl` + `+` / `-` / `0`, com botão **Ajustar à tela**.
- Navegação arrastando o fundo do quadro e criação de caixa com dois cliques na folha.
- Refazer (`Ctrl` + `Shift` + `Z` ou `Ctrl` + `Y`) com botão na barra do quadro, `Ctrl` + `A` para selecionar tudo e movimento pelas setas do teclado no histórico.
- Etiquetas com fundo para o texto das setas, que sobem quando o espaço entre as formas é curto.
- Reordenação dos blocos da aula e apresentação em tela cheia real, com `Enter`, `Home` e `End`.
- Indicador **Salvando…** / **Salvo neste navegador** e aviso quando o navegador bloqueia o armazenamento.
- Janela de confirmação própria ao trocar o código por um exemplo, com a opção **Copiar e trocar**.
- Zoom com `Ctrl` + roda do mouse na visualização Mermaid.
- Tecla `?` abre a ajuda.
- Favicon, metadados de página e versão real no rodapé.

### Interface

- Tokens de raio, sombra, duração e curva de animação aplicados em todo o estúdio e na página inicial.
- Transições em botões, abas, campos, cartões, listas e paleta de cores, com estado de clique.
- Notificações, janelas, menu de temas, troca de aba e estado vazio com animações de entrada.
- Cabeçalho translúcido e sublinhado animado nos links da página inicial.
- Carregamento do estúdio com indicador no lugar de uma tela vazia.
- Lista de atalhos organizada no painel de propriedades e na ajuda.

### Correções

- O estúdio não ultrapassa mais a largura da tela em celulares.
- Os links de seção da página inicial não ficam escondidos atrás do cabeçalho fixo.
- Texto selecionado sem querer ao dar dois cliques no quadro.
- O estado vazio do quadro fica centralizado na área visível.
- O aviso de carregamento usa a variável de cor certa do tema.
- Renomear um elemento sem mudar o texto não cria mais uma entrada vazia no histórico.

### Código

- Componente `Modal` com foco preso, retorno do foco, `Esc` e bloqueio de rolagem, usado pela ajuda, pela biblioteca de Design Patterns e pelas confirmações.
- Estado salvo lido nos valores iniciais depois da hidratação, sem desligar regras do ESLint.
- Gravação no `localStorage` com pausa de 450 ms e gravação final ao fechar a aba.
- Atalhos, roda do mouse e tela cheia com `useEffectEvent`.
- Busca de formas por `Map` ao desenhar as setas.
- Versão lida do `package.json`, `engines` com Node.js 20.9 ou mais recente e script `npm run check`.
- CI com lint, verificação de tipos e build em Node.js 22.
- `.gitignore` para `node_modules`, `.next` e arquivos locais.
- Código sem comentários.

## 0.5.0

- Primeira versão pública: quadro, editor Mermaid, aula desenhada à mão, 63 modelos, 46 Design Patterns, cinco temas e exportação em SVG, PNG e Markdown.
