# Contribuindo com o NexoGraph

Obrigado por querer ajudar! Qualquer contribuição é bem-vinda: correção de erro, ideia nova, melhoria de texto, modelo de diagrama ou ajuste de acessibilidade.

## Antes de começar

1. Leia a seção [Licença](README.md#licença) e o arquivo [`LICENSE`](LICENSE). Em resumo: o código é público para a comunidade ajudar, mas não pode ser publicado nem distribuído como outro projeto.
2. Abra uma *issue* explicando o que você quer fazer, para a gente conversar antes de você gastar tempo.

## Como propor uma mudança

1. Faça um *fork* do repositório no GitHub.
2. Crie uma branch com um nome que diga o que ela faz, por exemplo `corrige-seta-no-quadro`.
3. Instale e rode o projeto:

   ```bash
   npm install
   npm run dev
   ```

4. Faça a mudança, com commits pequenos e mensagens claras em português.
5. Confira se tudo passa (ou rode tudo de uma vez com `npm run check`):

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

6. Abra um *pull request* contando o que mudou e por quê. Se mexeu na tela, mande uma imagem do antes e do depois.

## Regras do projeto

- **Sem gradientes.** Use cores chapadas, em qualquer parte do site.
- **Cores dos temas em hexadecimal**, pelas variáveis CSS de `app/globals.css`. Nada de cor fixa nos componentes.
- **Textos em português do Brasil**, sem travessão longo, e com linguagem simples: o NexoGraph precisa ser fácil para quem nunca usou.
- **Acessibilidade:** botões com nome, foco visível e uso por teclado. Janelas novas usam o componente `components/Modal.tsx`.
- **Movimento:** use os tokens `--dur`, `--ease` e `--shadow-*` de `app/globals.css` para transições e sombras, e confira que tudo continua bem com a opção de reduzir movimento.
- **Sem comentários no código:** nomes claros no lugar de comentários.
- **Sem backend e sem conta:** os dados continuam no navegador.
- Antes de usar uma API do Next.js, confira a documentação em `node_modules/next/dist/docs/`, porque esta versão tem mudanças em relação às anteriores.

## Ideias que ajudariam

- Editar rótulos de setas com mais liberdade e selecionar elementos por área no quadro.
- Notas do professor na apresentação.
- Importar um arquivo `.mmd` para o quadro.
- Novos temas e novos modelos de diagrama.
- Testes automatizados do quadro e do editor.

## Licença das contribuições

Ao enviar uma contribuição, você concorda com o item 3 do arquivo [`LICENSE`](LICENSE).
