import { NavLink } from 'react-router'
import {
  Calculator,
  FileUp,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Moon,
  Percent,
  Settings,
  Shapes,
  Sun,
  Users,
  Wallet,
  type LucideIcon
} from 'lucide-react'
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
  IconeSaude,
  type ComponenteIconeOikonomia
} from '../icones'
import { useAutenticacao } from '../../contextos/AutenticacaoContexto'
import { useTema } from '../../contextos/TemaContexto'
import { classes } from '../../utilitarios/classes'
import estilos from './Layout.module.css'

interface ItemMenu {
  rota: string
  rotulo: string
  icone: LucideIcon | ComponenteIconeOikonomia
}

const GRUPOS: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: 'Visão geral',
    itens: [
      { rota: '/', rotulo: 'Painel', icone: IconePainel },
      { rota: '/lancamentos', rotulo: 'Lançamentos', icone: IconeLancamentos },
      { rota: '/contas', rotulo: 'Contas e saldos', icone: IconeContas },
      { rota: '/recorrentes', rotulo: 'Contas recorrentes', icone: IconeRecorrencias },
      { rota: '/cartoes', rotulo: 'Cartões', icone: IconeCartoes },
      { rota: '/previsao', rotulo: 'Previsão', icone: IconePrevisao }
    ]
  },
  {
    titulo: 'Cadastros',
    itens: [
      { rota: '/familia', rotulo: 'Família', icone: Users },
      { rota: '/categorias', rotulo: 'Categorias', icone: Shapes }
    ]
  },
  {
    titulo: 'Planejamento',
    itens: [
      { rota: '/taxas', rotulo: 'Taxas de juros', icone: Percent },
      { rota: '/saude', rotulo: 'Saúde financeira', icone: IconeSaude },
      { rota: '/objetivos', rotulo: 'Objetivos', icone: IconeObjetivos },
      { rota: '/analises', rotulo: 'Análises', icone: IconeAnalises },
      { rota: '/dividas', rotulo: 'Dívidas', icone: IconeDividas },
      { rota: '/aperto', rotulo: 'Plano de aperto', icone: IconeAperto },
      { rota: '/credito', rotulo: 'Simular crédito', icone: Calculator }
    ]
  },
  {
    titulo: 'Inteligência',
    itens: [
      { rota: '/assistente', rotulo: 'Assistente IA', icone: IconeAssistente },
      { rota: '/importar', rotulo: 'Importar documentos', icone: FileUp },
      { rota: '/configuracoes', rotulo: 'Configurações', icone: Settings },
      ...(import.meta.env.DEV
        ? [{ rota: '/biblioteca-icones', rotulo: 'Vitrine de ícones', icone: Shapes }]
        : [])
    ]
  }
]

export function BarraLateral({ recolhido, aoAlternar }: { recolhido: boolean; aoAlternar: () => void }) {
  const { tema, alternarTema } = useTema()
  const { usuario, sair } = useAutenticacao()

  return (
    <aside className={classes(estilos.lateral, recolhido && estilos.lateralRecolhida)}>
      <div className={estilos.marca}>
        <span className={estilos.marcaIcone}>
          <Wallet size={20} strokeWidth={2.2} />
        </span>
        <div className={estilos.marcaTexto}>
          <strong className={estilos.marcaNome}>Projeto Financeiro</strong>
          <span className={estilos.marcaSub}>Finanças da família</span>
        </div>
        <button
          type="button"
          className={estilos.recolher}
          onClick={aoAlternar}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          title={recolhido ? 'Expandir menu' : 'Recolher menu'}
        >
          {recolhido ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className={estilos.menu}>
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className={estilos.grupo}>
            <span className={estilos.grupoTitulo}>{grupo.titulo}</span>
            {grupo.itens.map(({ rota, rotulo, icone: Icone }) => (
              <NavLink
                key={rota}
                to={rota}
                end
                title={recolhido ? rotulo : undefined}
                className={({ isActive }) => classes(estilos.item, isActive && estilos.itemAtivo)}
              >
                <Icone size={18} strokeWidth={2} />
                <span>{rotulo}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button className={estilos.botaoTema} onClick={alternarTema} title={recolhido ? (tema === 'claro' ? 'Tema escuro' : 'Tema claro') : undefined}>
        {tema === 'claro' ? <Moon size={17} /> : <Sun size={17} />}
        <span>{tema === 'claro' ? 'Tema escuro' : 'Tema claro'}</span>
      </button>

      {usuario && (
        <div className={estilos.usuario}>
          <span className={estilos.usuarioAvatar}>{usuario.nome.trim().charAt(0).toUpperCase()}</span>
          <div className={estilos.usuarioTexto}>
            <strong>{usuario.nome}</strong>
            <span>{usuario.email}</span>
          </div>
          <button className={estilos.sair} onClick={sair} aria-label="Sair" title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}
