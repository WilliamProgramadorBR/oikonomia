import { HashRouter, Route, Routes } from 'react-router'
import { Wallet } from 'lucide-react'
import { Layout } from './componentes/layout/Layout'
import { ProvedorAutenticacao, useAutenticacao } from './contextos/AutenticacaoContexto'
import { ProvedorDados } from './contextos/DadosContexto'
import { ProvedorNotificacoes } from './contextos/NotificacaoContexto'
import { ProvedorTema } from './contextos/TemaContexto'
import { ProvedorVisao } from './contextos/VisaoContexto'
import { Acesso } from './paginas/Acesso/Acesso'
import { Analises } from './paginas/Analises/Analises'
import { Assistente } from './paginas/Assistente/Assistente'
import { Cartoes } from './paginas/Cartoes/Cartoes'
import { Categorias } from './paginas/Categorias/Categorias'
import { Configuracoes } from './paginas/Configuracoes/Configuracoes'
import { Credito } from './paginas/Credito/Credito'
import { Dividas } from './paginas/Dividas/Dividas'
import { Familia } from './paginas/Familia/Familia'
import { Importar } from './paginas/Importar/Importar'
import { Lancamentos } from './paginas/Lancamentos/Lancamentos'
import { Objetivos } from './paginas/Objetivos/Objetivos'
import { Painel } from './paginas/Painel/Painel'
import { Previsao } from './paginas/Previsao/Previsao'
import { Recorrentes } from './paginas/Recorrentes/Recorrentes'
import { Saude } from './paginas/Saude/Saude'
import { Taxas } from './paginas/Taxas/Taxas'

export function App() {
  return (
    <ProvedorTema>
      <ProvedorNotificacoes>
        <ProvedorAutenticacao>
          <PortaoAcesso />
        </ProvedorAutenticacao>
      </ProvedorNotificacoes>
    </ProvedorTema>
  )
}

// Sem sessão, só a tela de acesso existe; o app (e qualquer consulta) só monta depois de entrar.
function PortaoAcesso() {
  const { estado, usuario } = useAutenticacao()
  if (!estado) {
    return (
      <div className="abertura">
        <Wallet size={28} />
      </div>
    )
  }
  if (!usuario) return <Acesso estado={estado} />
  return <Aplicativo key={usuario.id} />
}

// HashRouter porque, empacotado, o Electron carrega o app via file:// (sem servidor).
function Aplicativo() {
  return (
    <ProvedorDados>
      <ProvedorVisao>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Painel />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/recorrentes" element={<Recorrentes />} />
              <Route path="/previsao" element={<Previsao />} />
              <Route path="/cartoes" element={<Cartoes />} />
              <Route path="/taxas" element={<Taxas />} />
              <Route path="/saude" element={<Saude />} />
              <Route path="/analises" element={<Analises />} />
              <Route path="/objetivos" element={<Objetivos />} />
              <Route path="/dividas" element={<Dividas />} />
              <Route path="/credito" element={<Credito />} />
              <Route path="/familia" element={<Familia />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/assistente" element={<Assistente />} />
              <Route path="/importar" element={<Importar />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </Layout>
        </HashRouter>
      </ProvedorVisao>
    </ProvedorDados>
  )
}
