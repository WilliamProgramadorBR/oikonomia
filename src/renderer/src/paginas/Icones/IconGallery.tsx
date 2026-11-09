import type { ComponenteIconeOikonomia, VarianteIconeOikonomia } from '../../componentes/icones'
import {
  IconeAnalises,
  IconeAssistente,
  IconeCartoes,
  IconeContas,
  IconeDividas,
  IconeLancamentos,
  IconeObjetivos,
  IconePainel,
  IconeAperto,
  IconePrevisao,
  IconeRecorrencias,
  IconeSaude
} from '../../componentes/icones'
import estilos from './IconGallery.module.css'

interface ItemGaleria {
  nome: string
  uso: string
  Icone: ComponenteIconeOikonomia
}

const ICONES: ItemGaleria[] = [
  { nome: 'Painel', uso: 'Visão geral e controle', Icone: IconePainel },
  { nome: 'Lançamentos', uso: 'Fluxo de entradas e saídas', Icone: IconeLancamentos },
  { nome: 'Contas e saldos', uso: 'Dinheiro disponível', Icone: IconeContas },
  { nome: 'Contas recorrentes', uso: 'Compromissos previsíveis', Icone: IconeRecorrencias },
  { nome: 'Cartões', uso: 'Crédito, parcelas e faturas', Icone: IconeCartoes },
  { nome: 'Previsão', uso: 'Projeção dos próximos meses', Icone: IconePrevisao },
  { nome: 'Saúde financeira', uso: 'Proteção e estabilidade', Icone: IconeSaude },
  { nome: 'Objetivos', uso: 'Jornada até uma conquista', Icone: IconeObjetivos },
  { nome: 'Análises', uso: 'Leitura aprofundada dos dados', Icone: IconeAnalises },
  { nome: 'Dívidas', uso: 'Valores a quitar sob controle', Icone: IconeDividas },
  { nome: 'Plano de aperto', uso: 'Rota para reorganização', Icone: IconeAperto },
  { nome: 'Assistente IA', uso: 'Apoio inteligente à decisão', Icone: IconeAssistente }
]

const VARIANTES: { nome: string; valor: VarianteIconeOikonomia }[] = [
  { nome: 'Mono', valor: 'mono' },
  { nome: 'Duotone', valor: 'duotone' },
  { nome: 'Accent', valor: 'accent' }
]

const TAMANHOS = [18, 24, 32, 48] as const

function Colecao({ tema }: { tema: 'claro' | 'escuro' }) {
  return (
    <section className={tema === 'claro' ? estilos.temaClaro : estilos.temaEscuro}>
      <div className={estilos.temaCabecalho}>
        <div>
          <span className={estilos.sobretitulo}>Tema {tema}</span>
          <h2>Biblioteca principal</h2>
        </div>
        <span className={estilos.amostraCores} aria-label="Azul, lilás e menta" />
      </div>

      <div className={estilos.listaIcones}>
        {ICONES.map(({ nome, uso, Icone }) => (
          <article key={nome} className={estilos.item}>
            <div className={estilos.itemDescricao}>
              <span className={estilos.areaIcone}>
                <Icone size={32} variant="accent" decorative={false} title={nome} />
              </span>
              <div>
                <strong>{nome}</strong>
                <span>{uso}</span>
              </div>
            </div>
            <div className={estilos.amostras}>
              {VARIANTES.map(({ nome: nomeVariante, valor }) => (
                <div key={valor} className={estilos.linhaVariante}>
                  <small>{nomeVariante}</small>
                  {TAMANHOS.map((tamanho) => (
                    <span key={tamanho} className={estilos.celulaIcone} title={`${nome} · ${nomeVariante} · ${tamanho}px`}>
                      <Icone size={tamanho} variant={valor} />
                      <i>{tamanho}</i>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function MenuSimulado({ recolhido = false }: { recolhido?: boolean }) {
  return (
    <nav className={recolhido ? estilos.menuRecolhido : estilos.menuExpandido} aria-label={`Menu ${recolhido ? 'recolhido' : 'expandido'} de demonstração`}>
      <span className={estilos.menuMarca}>{recolhido ? 'O' : 'Oikonomia'}</span>
      {ICONES.map(({ nome, Icone }, indice) => (
        <span
          key={nome}
          className={[estilos.menuItem, indice === 7 ? estilos.menuItemAtivo : ''].filter(Boolean).join(' ')}
          title={recolhido ? nome : undefined}
        >
          <Icone size={18} variant="duotone" />
          {!recolhido && <span>{nome}</span>}
        </span>
      ))}
    </nav>
  )
}

function SimulacaoMenu() {
  return (
    <section className={estilos.simulacao}>
      <div className={estilos.simulacaoCabecalho}>
        <div>
          <span className={estilos.sobretitulo}>Contexto real</span>
          <h2>Menu lateral em 18 px</h2>
        </div>
        <p>Estados normal, ativo e recolhido no fundo azul-marinho da assinatura.</p>
      </div>
      <div className={estilos.menus}>
        <div>
          <small>Expandido</small>
          <MenuSimulado />
        </div>
        <div>
          <small>Recolhido</small>
          <MenuSimulado recolhido />
        </div>
      </div>
    </section>
  )
}

export function IconGallery() {
  return (
    <div className={estilos.pagina}>
      <section className={estilos.apresentacao}>
        <div className={estilos.marcaObjetivo}>
          <IconeObjetivos size={58} variant="accent" decorative={false} title="Objetivos Oikonomia" />
        </div>
        <div>
          <span className={estilos.sobretitulo}>Oikonomia Signature · primeira coleção</span>
          <h2>Clareza financeira com uma assinatura própria</h2>
          <p>
            Traços arredondados, geometria simples e um acento menta discreto. A rota ascendente de Objetivos
            define a linguagem visual da família.
          </p>
        </div>
      </section>

      <section className={estilos.especificacoes} aria-label="Variações do ícone de Objetivos">
        <div>
          <span className={estilos.sobretitulo}>Variantes</span>
          <div className={estilos.variantes}>
            {VARIANTES.map(({ nome, valor }) => (
              <span key={valor} className={estilos.variante}>
                <IconeObjetivos size={30} variant={valor} />
                <small>{nome}</small>
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className={estilos.sobretitulo}>Escala obrigatória</span>
          <div className={estilos.escala}>
            {TAMANHOS.map((tamanho) => (
              <span key={tamanho}>
                <IconeObjetivos size={tamanho} />
                <small>{tamanho}px</small>
              </span>
            ))}
          </div>
        </div>
      </section>

      <SimulacaoMenu />

      <div className={estilos.temas}>
        <Colecao tema="claro" />
        <Colecao tema="escuro" />
      </div>
    </div>
  )
}
