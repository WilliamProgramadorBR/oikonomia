# Oikonomia

> *oîkos* (casa) + *nómos* (administração): a palavra grega que deu origem a "economia".

**Projeto Financeiro**: gestão financeira da família com previsão dos próximos meses, saúde
financeira, regressão linear, objetivos realistas, estratégia de quitação de dívidas e assistente
com IA. **Electron + React + TypeScript + SQLite**, arquitetura limpa e dados cifrados (AES-256-GCM).

Autor: **William Oliveira Dos Santos** · [meuperfil-b964d.web.app](https://meuperfil-b964d.web.app/)

## Comandos

| Comando             | O que faz                                        |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Abre o app em modo desenvolvimento (hot reload)  |
| `npm run typecheck` | Verifica os tipos do backend e do frontend       |
| `npm run build`     | Typecheck + gera o bundle em `out/`              |
| `npm run dist:win`  | Gera o instalador Windows em `dist/`             |
| `npm run dist:mac`  | Gera o `.dmg` do macOS (precisa rodar em um Mac) |

Os dados ficam em `%APPDATA%\Projeto Financeiro\` (no Mac, `~/Library/Application Support/Projeto Financeiro/`).
Usamos o SQLite embutido no Node (`node:sqlite`), então não há módulo nativo para compilar.

## Criptografia dos dados

- O banco **nunca é gravado aberto**: ele roda em memória e vai para o disco como
  `financeiro.db` = `PFCIFRA1 | iv | tag | AES-256-GCM(deflate(banco))`
  (`infraestrutura/banco/conexao.ts`, classe `ArmazenamentoCifrado`). O GCM também garante
  integridade: com um byte alterado no arquivo, o app se recusa a abrir.
- A chave (256 bits, aleatória) fica em `financeiro.db.chave`, **cifrada pelo cofre do sistema**
  (DPAPI no Windows, Keychain no macOS) via `CofreSistema`. Copiar os arquivos para outro computador
  ou outro usuário do Windows não revela nada.
- Gravação atômica (arquivo temporário + troca) após cada operação, a cada 15 s e ao fechar; uma cópia
  cifrada da versão anterior fica em `financeiro.db.anterior`. Bancos antigos sem criptografia são
  convertidos sozinhos na primeira abertura.
- O app roda em **instância única** (duas janelas sobre o mesmo banco sobrescreveriam os dados).
- **Backup**: copie a pasta inteira de dados (inclui `Local State`, onde o Electron guarda a chave
  mestra protegida pelo DPAPI). Formatar o Windows ou trocar de usuário sem esse backup torna os dados
  irrecuperáveis: é o preço de a chave não sair da máquina.

## Ícone e instalador

- Fonte do ícone: `resources/icone.svg`. Dele saem `icon.png` (1024), `icon.ico` (Windows, 16–256)
  e `icon.icns` (macOS, 16–1024), renderizados pelo próprio Chromium do Electron.
- `electron-builder.yml`: NSIS para Windows (escolha da pasta, atalhos, desinstalar não apaga os
  dados) e DMG para macOS (Intel e Apple Silicon). O instalador não leva `node_modules`: o front é
  empacotado pelo Vite e o processo principal só usa módulos nativos do Node/Electron.
- Sem certificado de assinatura, o Windows mostra o aviso do SmartScreen ("Mais informações →
  Executar assim mesmo"). Para distribuir para outras pessoas, assine o executável.

## Previsto x confirmado (contas recorrentes)

- Todo lançamento tem um **status**: `prevista` (estimada, gerada por conta recorrente),
  `confirmada` (valor real) ou `ignorada` (ocorrência pulada, não conta em nada).
- **Tipos:** `receita`, `despesa` e `guardado` (aporte/poupança: não é gasto, não entra nas despesas).
- **SincronizarRecorrencias** mantém um lançamento previsto por recorrência em cada um dos próximos
  12 meses. Roda ao abrir o app, ao criar uma recorrência e ao confirmar um valor. É idempotente
  (índice único por recorrência + mês).
- **Contas variáveis** (luz, água): a estimativa é a média ponderada dos últimos valores confirmados
  ([estimativa.ts](src/compartilhado/financeiro/estimativa.ts)); confirmar um valor reestima as
  ocorrências futuras ainda previstas.
- **Recorrência no cartão:** a ocorrência cai no vencimento da fatura (mesma regra das compras) e
  conta uma vez só. Ocorrências previstas aparecem na fatura projetada, mas não ocupam limite.
- **Previsão (provisão):** por mês = contas recorrentes + parcelas + avulsos lançados + reserva para
  imprevistos (média dos avulsos dos últimos 3 meses com dados). Lançamentos manuais antigos com a
  mesma descrição e categoria de uma recorrência não contam como imprevisto.
- **Natureza** das categorias de despesa: essencial, estilo de vida, investimento em você, juros, outros.

## Saúde financeira e limite seguro de crédito

- **Avaliador** puro no domínio ([AvaliadorSaudeFinanceira.ts](src/backend/dominio/servicos/AvaliadorSaudeFinanceira.ts)):
  recebe números agregados do **próximo mês** e devolve indicadores, nota (0–100), orçamento e limite.
- **Indicadores e referências:** renda comprometida (até 50%), peso das parcelas (até 15%; teto 30%),
  uso do limite dos cartões (até 30%), capacidade de poupança (20%+), reserva de emergência (6 meses
  de custo de vida), juros pagos (zero), meses no vermelho na projeção (nenhum). Cada um vira uma
  pontuação por interpolação linear; a nota é a média ponderada.
- **Orçamento do mês:** renda − contas recorrentes − parcelas − imprevistos − guardar (programado +
  sugerido para chegar perto de 20%, nunca mais que metade da sobra) − margem de segurança (10%)
  = livre para gastar.
- **Limite seguro de crédito** = mín(livre para gastar, 30% da renda − parcelas atuais): quanto de
  NOVAS parcelas cabe por mês; a tabela de compra máxima também respeita o limite disponível dos cartões.
- **Textos:** porta `INarradorFinanceiro`. Hoje `NarradorNativo` (regras escritas no app, sempre
  funciona); o Gemini entrará como outra implementação, com o nativo como plano B.

## Objetivos e perfil financeiro

- **Perfil da família** ([PerfilFinanceiro.ts](src/backend/dominio/entidades/PerfilFinanceiro.ts)):
  estilo (conservador / equilibrado / arrojado) define meta de poupança (25/20/15%), margem de
  segurança (15/10/5%), teto de parcelas (20/30/35%) e reserva ideal (9/6/4 meses). A prioridade
  (quitar primeiro / equilibrar / guardar primeiro) decide se o plano manda quitar dívida cara antes.
  Saúde financeira e objetivos usam esses parâmetros.
- **Objetivo:** valor alvo, quanto já existe, prazo, prioridade. Aportes são lançamentos `guardado`
  com `objetivo_id`; "Programar aporte" cria uma recorrência de guardar ligada ao objetivo (entra
  na previsão).
- **Planejador** ([PlanejadorObjetivos.ts](src/backend/dominio/servicos/PlanejadorObjetivos.ts)):
  valor futuro com rendimento mensal (PMT para chegar no prazo; prazo para um aporte dado).
- **Folga para objetivos** = média do saldo projetado dos próximos 6 meses − margem de segurança
  (a previsão já desconta os aportes programados).
- **Cascata:** mês a mês, a folga vai para os objetivos por prioridade (cada um recebe o necessário
  para o prazo, recalculado todo mês); quando um termina, o aporte dele passa para os seguintes.
  Daí saem o prazo realista, o mês de início ("na fila") e a projeção de cada objetivo.
- **Viabilidade:** no caminho, cabe no orçamento, exige cortes (20% das maiores categorias de estilo
  de vida), não dá no prazo (sugere prazo realista ou meta possível), na fila, sem folga.
- **Dívida cara:** parcelas de compras com juros a vencer, com taxa acima do rendimento esperado.

## Dívidas e simulador de crédito

- **Matemática de crédito** em [credito.ts](src/compartilhado/financeiro/credito.ts): Price, SAC,
  valor presente e saldo devedor (usada no backend e na tabela de amortização da tela).
- **Dívida cadastrada:** parcela + parcelas restantes + taxa (o saldo é calculado por valor presente,
  ou informado). A parcela vira recorrência com fim definido, ligada à dívida (`divida_id`): entra na
  previsão como **parcela** (não conta fixa), pesa no teto de parcelas da saúde financeira, e o saldo
  cai a cada parcela confirmada. Cheque especial / rotativo não têm parcela: só o saldo e a taxa.
- Compras parceladas **com juros** no cartão aparecem como dívida automaticamente.
- **Estratégia de quitação** ([EstrategiaQuitacao.ts](src/backend/dominio/servicos/EstrategiaQuitacao.ts)):
  simulação mês a mês de só as parcelas × avalanche (maior juro) × bola de neve (menor saldo), com o
  extra mensal (padrão: folga do orçamento) e o efeito bola de neve das parcelas liberadas. Dívida que
  nunca termina retorna "não quita" (sem número de juros). Bola de neve é recomendada só se custar até
  5% (ou R$ 100) a mais que a avalanche.
- **Trocas:** compara cada dívida com a mediana do Banco Central de consignado e crédito pessoal (e
  portabilidade quando a taxa está 20% acima da mediana da própria modalidade), no mesmo prazo.
- **Simulador:** ranking de todos os bancos da modalidade (inclui financiamento imobiliário, da série
  mensal do Banco Central) por custo total, com a indicação se a parcela cabe no limite seguro.

## Análises

- Usam só **meses completos** e lançamentos **confirmados** (o mês corrente distorceria tendências).
  O período começa no primeiro mês com dados, para meses antes do uso não virarem "zero".
- **Quem gasta o quê:** participação, média mensal, ticket médio, frequência, variação do último mês
  x média anterior, categorias e lugares mais frequentes, natureza. O texto reconhece quando a maior
  parte é essencial (aluguel não é "exagero") e sugere teto só no maior gasto de estilo de vida.
- **Natureza x renda** (50/30/20 adaptado): essencial até 50%, estilo de vida até 30%, investimento em
  você 5%+, juros zero.
- **Tendências:** [RegressaoLinear.ts](src/backend/dominio/servicos/RegressaoLinear.ts) (mínimos
  quadrados, R²). Só mostramos tendência de categoria quando R² ≥ 0,5 e a inclinação ≥ 5% da média.
- **Hábitos:** [DetectorHabitos.ts](src/backend/dominio/servicos/DetectorHabitos.ts): gasto avulso com
  mesma descrição e categoria em 3+ meses (2 dos 3 últimos) e valor estável (variação ≤ 25%).
  O botão "Tornar recorrente" abre a conta recorrente já preenchida, começando no mês seguinte.

## Acesso: login, cadastro e recuperação de senha

- **Primeiro uso**: a tela inicial mostra a apresentação em carrossel e o cadastro em 4 passos
  (você → e-mail → senha → pronto). Se já houver pessoas na família, a conta pode ser ligada a uma delas.
- **Depois**: login com "manter conectado" (token cifrado pelo sistema via `safeStorage`, 30 dias;
  sem isso a sessão dura 12 h). Novas contas só podem ser criadas por quem já está conectado
  (Configurações → Acessos da família), para ninguém criar conta no computador e ver os dados.
- **Segurança**:
  - senhas com **scrypt** (N=2^15, sal por senha, comparação em tempo constante); política
    compartilhada em `compartilhado/seguranca/senha.ts` (mín. 8, letra + número, sem nome/e-mail,
    sem senhas comuns) usada no backend e no medidor de força da tela;
  - mesma mensagem e mesmo tempo de resposta para e-mail inexistente e senha errada;
  - bloqueio progressivo: 5 erros → 15 min, depois 30 min, 1 h... até 24 h;
  - o banco guarda só o **resumo SHA-256** de tokens de sessão e códigos de recuperação;
  - **todo canal IPC é protegido por padrão** (`registrarHandlersIpc`): sem sessão, nada executa;
    a janela não navega para fora do app.
- **Recuperação de senha**: código de 6 dígitos, válido por 15 min, no máximo 5 tentativas por código
  e 3 pedidos a cada 15 min; trocar a senha encerra todas as sessões da conta.
  **O envio de e-mail ainda não está ligado**: `infraestrutura/email/EnvioEmailPendente.ts` só mostra
  a mensagem no terminal em desenvolvimento. Para ligar, implemente `IEnvioEmail`
  (`dominio/portas/IEnvioEmail.ts`) com SMTP/Resend/SendGrid e troque `email:` no `container.ts`.
- Os dados financeiros continuam no SQLite local **sem criptografia do arquivo**; o login protege o
  uso do app, não uma cópia do arquivo do banco.

## Inteligência artificial e importação de documentos

- **Configurações**: cadastre a chave do Google Gemini (crie em aistudio.google.com/apikey). A chave é
  criptografada com o `safeStorage` do Electron (DPAPI no Windows) e **nunca volta para a tela**.
  Modelo padrão: `gemini-2.5-flash`.
- **Sempre com plano B**: sem chave, sem internet ou com erro da IA, o app usa os próprios textos
  (`NarradorNativo` e `RespostasNativas`). A IA só *escreve*; todos os números são calculados pelo app.
- **Assistente IA**: chat que recebe um resumo dos números (saúde, previsão, objetivos, dívidas,
  análises). Cada resposta indica se veio do Gemini ou do app (e por que caiu no plano B).
- **Contracheque** (PDF ou foto): o Gemini extrai bruto, descontos, líquido e datas; você confere e
  lança. Se existir salário **previsto** no mês, ele é confirmado com o valor real; senão vira receita.
  Sem IA, o formulário é preenchido à mão.
- **Nota fiscal (NFC-e)**: foto do QR code (lido no próprio app com `jsqr`) ou o link colado. A página
  da SEFAZ é lida pelo parser do layout padrão; se o estado usar outro layout, a IA lê o texto da
  página; em último caso, a chave de acesso informa CNPJ e mês. Compra lançada na conta ou no cartão.
- Privacidade: com IA ligada, um resumo dos números e os documentos enviados vão para o Google.

## Cartões e taxas de juros

- **Parcelas por fatura:** uma compra em N vezes gera N transações de despesa, cada uma no mês
  da fatura em que vence (regra de fechamento/vencimento em
  [parcelamento.ts](src/compartilhado/financeiro/parcelamento.ts)). O painel e os lançamentos
  enxergam as parcelas sem nenhum código especial. Parcela não é removida sozinha: remove-se a compra.
- **Com juros:** tabela Price, `PMT = PV · i / (1 − (1 + i)^−n)`. A mesma função gera as parcelas
  no backend e a prévia no formulário.
- **Limite comprometido:** soma das parcelas com vencimento a partir de hoje (supõe faturas passadas pagas).
- **Taxas do Banco Central:** API pública Olinda, serviço `taxaJuros`
  (`TaxasJurosDiariaPorInicioPeriodo`, segmento pessoa física). Guardamos só o período mais recente
  no SQLite e atualizamos ao abrir o app (no máximo uma vez por dia) ou pelo botão "Atualizar".
  Sem internet, o app usa as últimas taxas salvas. São **médias** por instituição; a taxa do
  contrato informada no cartão tem prioridade.

## Arquitetura (limpa)

```
src/
├── compartilhado/            Contratos entre front e back (só tipos e constantes)
│   ├── contratos/            ApiFinanceiro, Resposta<T>, nomes dos canais IPC
│   ├── dtos/                 Formatos de dados que trafegam (pessoa, categoria, transacao, painel)
│   ├── financeiro/           Matemática pura compartilhada (parcelamento, Price, faturas)
│   └── utilitarios/          Funções puras usadas nos dois lados (meses e datas)
│
├── backend/
│   ├── dominio/              Regras de negócio puras. Não importa NADA de fora.
│   │   ├── entidades/        Pessoa, Categoria, Transacao, Cartao, CompraCartao, TaxaMercado
│   │   ├── repositorios/     Interfaces (portas): IPessoaRepositorio, ITransacaoRepositorio...
│   │   ├── portas/           Serviços externos: IProvedorTaxasMercado
│   │   └── erros/            ErroDominio, ErroNaoEncontrado
│   ├── aplicacao/            Casos de uso: orquestram o domínio
│   │   ├── casos-de-uso/     pessoa/, categoria/, transacao/, painel/ (ObterPainel)
│   │   └── mapeadores/       Entidade -> DTO
│   ├── infraestrutura/       Detalhes técnicos: implementam as portas
│   │   ├── banco/            Conexão SQLite e migrações (002 já cadastra as categorias padrão)
│   │   ├── repositorios/     *RepositorioSqlite
│   │   └── externos/         BancoCentralProvedorTaxas (API pública do Banco Central)
│   ├── apresentacao/         Entrada do backend
│   │   └── ipc/              Controladores + registro dos handlers IPC
│   └── principal/            container.ts: monta e injeta todas as dependências
│
├── main/                     Processo principal do Electron (janela, ciclo de vida)
├── preload/                  Ponte segura: expõe window.api ao React
│
└── renderer/src/             Frontend React
    ├── paginas/              Telas: Painel, Lancamentos, Familia, Categorias, EmBreve
    ├── componentes/
    │   ├── ui/               Design system: Botao, Cartao, Campo, Modal, Alternador, Avatar...
    │   ├── layout/           Menu lateral, barra superior (visão família/pessoa + mês)
    │   ├── graficos/         Recharts: fluxo mensal, rosca de categorias, ranking
    │   └── transacoes/       Lista e formulário de lançamento
    ├── contextos/            Tema, Visão (pessoa + mês), Dados (recarga), Notificações
    ├── hooks/                useConsulta (busca + recarga automática), useAcao (alterações)
    ├── servicos/             Acesso ao backend (único lugar que toca window.api)
    ├── utilitarios/          Moeda, datas, ícones, paleta de cores
    └── estilos/              global.css com os tokens de design (temas claro e escuro)
```

### Design system

- **Tokens** em [global.css](src/renderer/src/estilos/global.css): cores, sombras e raios como variáveis CSS.
  O tema escuro só redefine as variáveis (`:root[data-tema='escuro']`).
- **CSS Modules** (`*.module.css`) por componente: nada de classes vazando entre telas.
- Fonte **Inter** empacotada no app (funciona offline). Ícones: **lucide-react**.
- Recarga automática: toda alteração feita via `useAcao` faz as consultas abertas (`useConsulta`) buscarem de novo.

**Regra de dependência:** as setas só apontam para dentro.
`apresentacao → aplicacao → dominio ← infraestrutura`. O domínio não conhece SQLite, Electron nem React.

**Fluxo de uma requisição:**
`Página → hook → servico → window.api (preload) → IPC → controlador → caso de uso → repositório → SQLite`

### Convenções

- Valores monetários são guardados em **centavos (inteiro)**, nunca em ponto flutuante.
- Datas de transação são `AAAA-MM-DD`; carimbos de tempo são ISO completos.
- Toda resposta do IPC vem no envelope `Resposta<T>` (`{ sucesso, dados }` ou `{ sucesso, erro }`).
- Repositórios são assíncronos, mesmo com SQLite síncrono, para permitir outras implementações.

## Como adicionar uma nova funcionalidade (ex.: Categoria)

1. **Domínio:** `dominio/entidades/Categoria.ts` e `dominio/repositorios/ICategoriaRepositorio.ts`
2. **DTOs:** `compartilhado/dtos/categoria.ts`
3. **Casos de uso:** `aplicacao/casos-de-uso/categoria/*.ts`
4. **Migração:** `infraestrutura/banco/migracoes/002_criar_categorias.ts` e registrar em `migracoes/index.ts`
5. **Repositório:** `infraestrutura/repositorios/CategoriaRepositorioSqlite.ts`
6. **Controlador:** `apresentacao/ipc/controladores/CategoriaControlador.ts`
7. **Contrato:** adicionar canais em `canais.ts` e métodos em `ApiFinanceiro` (`api.ts`)
8. **Ligação:** instanciar no `container.ts`, registrar em `registrarHandlersIpc.ts`, expor no `preload/index.ts`
9. **Frontend:** `servicos/categoriaServico.ts`, `hooks/useCategorias.ts`, página/componentes

## Futuro: Android e iOS

`dominio/`, `aplicacao/` e `compartilhado/` são TypeScript puro e podem ser reaproveitados.
No mobile (ex.: Capacitor), troca-se apenas:

- **Infraestrutura:** um repositório usando o SQLite do dispositivo (implementando as mesmas interfaces).
- **`renderer/src/servicos/api.ts`:** em vez de `window.api` (IPC), uma implementação de `ApiFinanceiro`
  que chama os casos de uso diretamente.
