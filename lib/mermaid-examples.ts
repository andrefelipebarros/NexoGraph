export type MermaidExample = { id: string; label: string; description: string; source: string };

export const mermaidExamples: MermaidExample[] = [
  {
    id: 'pedidos',
    label: 'Arquitetura de pedidos',
    description: 'Fluxo com cache e banco, usando os três tipos de seta.',
    source: `flowchart LR
  U([Usuário]) -->|HTTPS| G[Gateway]
  G --> S[[Serviço de pedidos]]
  S -.-> C[(Cache)]
  S ==> D[(Banco de dados)]`,
  },
  {
    id: 'fluxograma',
    label: 'Fluxograma',
    description: 'Etapas, decisão e volta para revisão.',
    source: `flowchart TD
  A([Início]) --> B{Está correto?}
  B -->|Sim| C[Publicar]
  B -.->|Não| D[Revisar]
  D --> B
  C ==> E([Fim])`,
  },
  {
    id: 'sequencia',
    label: 'Diagrama de sequência',
    description: 'Mensagens entre pessoas e sistemas ao longo do tempo.',
    source: `sequenceDiagram
  actor Usuario as Usuário
  participant App
  participant API
  participant DB as Banco de dados
  Usuario->>App: Entrar
  App->>API: POST /login
  API->>DB: Buscar usuário
  DB-->>API: Registro
  API-->>App: Token
  App-->>Usuario: Acesso liberado`,
  },
  {
    id: 'classes',
    label: 'Diagrama de classes',
    description: 'Classes, atributos, métodos e relações.',
    source: `classDiagram
  class Usuario {
    +UUID id
    +String nome
    +autenticar(senha) bool
  }
  class Pedido {
    +UUID id
    +total() Decimal
  }
  Usuario "1" --> "0..*" Pedido : faz
  Pedido ..> Usuario : notifica`,
  },
  {
    id: 'er',
    label: 'Entidade-relacionamento',
    description: 'Tabelas, chaves e cardinalidade.',
    source: `erDiagram
  USUARIO ||--o{ PEDIDO : realiza
  PEDIDO ||--|{ ITEM_PEDIDO : contem
  PRODUTO ||--o{ ITEM_PEDIDO : referencia
  USUARIO {
    string id PK
    string email
  }
  PEDIDO {
    string id PK
    date criado_em
  }`,
  },
  {
    id: 'estados',
    label: 'Máquina de estados',
    description: 'Estados de um pedido e o que dispara cada mudança.',
    source: `stateDiagram-v2
  [*] --> Novo
  Novo --> Pago : pagamento aprovado
  Novo --> Cancelado : tempo esgotado
  Pago --> Enviado : despachar
  Enviado --> [*]
  Cancelado --> [*]`,
  },
];

export const defaultMermaidSource = mermaidExamples[0].source;

/** Trechos que o painel "Inserir" coloca no cursor. */
export const mermaidSnippets: { label: string; hint: string; text: string }[] = [
  { label: 'Caixa', hint: 'Nó retangular', text: 'A[Texto]' },
  { label: 'Decisão', hint: 'Losango com pergunta', text: 'B{Pergunta?}' },
  { label: 'Banco de dados', hint: 'Cilindro', text: 'D[(Banco)]' },
  { label: 'Seta contínua', hint: 'Fluxo normal', text: ' --> ' },
  { label: 'Seta tracejada', hint: 'Opcional ou dependência', text: ' -.-> ' },
  { label: 'Seta grossa', hint: 'Caminho principal', text: ' ==> ' },
  { label: 'Seta com texto', hint: 'Texto sobre a seta', text: ' -->|texto| ' },
  { label: 'Grupo', hint: 'Agrupa vários nós', text: 'subgraph Grupo\n  A --> B\nend' },
  { label: 'Comentário', hint: 'Linha ignorada', text: '%% comentário' },
];
