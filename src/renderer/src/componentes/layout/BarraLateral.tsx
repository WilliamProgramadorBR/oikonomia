import { NavLink } from 'react-router'
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  Calculator,
  CalendarClock,
  ChartLine,
  CreditCard,
  FileUp,
  Landmark,
  LayoutDashboard,
  LogOut,
  Moon,
  Percent,
  Repeat,
  Settings,
  Shapes,
  Sparkles,
  Sun,
  Target,
  Users,
  Wallet,
  type LucideIcon
} from 'lucide-react'
import { useAutenticacao } from '../../contextos/AutenticacaoContexto'
import { useTema } from '../../contextos/TemaContexto'
import { classes } from '../../utilitarios/classes'
import estilos from './Layout.module.css'

interface ItemMenu {
  rota: string
  rotulo: string
  icone: LucideIcon
}

const GRUPOS: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: 'Visão geral',
    itens: [
      { rota: '/', rotulo: 'Painel', icone: LayoutDashboard },
      { rota: '/lancamentos', rotulo: 'Lançamentos', icone: ArrowLeftRight },
      { rota: '/contas', rotulo: 'Contas e saldos', icone: Banknote },
      { rota: '/recorrentes', rotulo: 'Contas recorrentes', icone: Repeat },
      { rota: '/cartoes', rotulo: 'Cartões', icone: CreditCard },
      { rota: '/previsao', rotulo: 'Previsão', icone: CalendarClock }
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
      { rota: '/saude', rotulo: 'Saúde financeira', icone: Activity },
      { rota: '/objetivos', rotulo: 'Objetivos', icone: Target },
      { rota: '/analises', rotulo: 'Análises', icone: ChartLine },
      { rota: '/dividas', rotulo: 'Dívidas', icone: Landmark },
      { rota: '/credito', rotulo: 'Simular crédito', icone: Calculator }
    ]
  },
  {
    titulo: 'Inteligência',
    itens: [
      { rota: '/assistente', rotulo: 'Assistente IA', icone: Sparkles },
      { rota: '/importar', rotulo: 'Importar documentos', icone: FileUp },
      { rota: '/configuracoes', rotulo: 'Configurações', icone: Settings }
    ]
  }
]

export function BarraLateral() {
  const { tema, alternarTema } = useTema()
  const { usuario, sair } = useAutenticacao()

  return (
    <aside className={estilos.lateral}>
      <div className={estilos.marca}>
        <span className={estilos.marcaIcone}>
          <Wallet size={20} strokeWidth={2.2} />
        </span>
        <div>
          <strong className={estilos.marcaNome}>Projeto Financeiro</strong>
          <span className={estilos.marcaSub}>Finanças da família</span>
        </div>
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
                className={({ isActive }) => classes(estilos.item, isActive && estilos.itemAtivo)}
              >
                <Icone size={18} strokeWidth={2} />
                <span>{rotulo}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button className={estilos.botaoTema} onClick={alternarTema}>
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
