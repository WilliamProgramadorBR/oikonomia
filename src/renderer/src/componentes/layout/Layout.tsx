import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { CriarRecorrenciaEntrada } from '@compartilhado/dtos/recorrencia'
import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import { ModalCartao } from '../cartoes/ModalCartao'
import { ModalCompraCartao } from '../cartoes/ModalCompraCartao'
import { ModalPerfil } from '../objetivos/ModalPerfil'
import { ModalRecorrencia } from '../recorrencias/ModalRecorrencia'
import { ModalConfirmar } from '../transacoes/ModalConfirmar'
import { ModalTransacao } from '../transacoes/ModalTransacao'
import { BarraLateral } from './BarraLateral'
import { BarraSuperior } from './BarraSuperior'
import estilos from './Layout.module.css'

const CABECALHOS: Record<string, { titulo: string; subtitulo: string }> = {
  '/': { titulo: 'Painel', subtitulo: 'Como estão as finanças neste mês' },
  '/lancamentos': { titulo: 'Lançamentos', subtitulo: 'Tudo o que entrou, saiu e foi guardado' },
  '/contas': { titulo: 'Contas e saldos', subtitulo: 'Quanto dinheiro tem em cada conta, conferido com o banco' },
  '/recorrentes': { titulo: 'Contas recorrentes', subtitulo: 'O que se repete todo mês' },
  '/previsao': { titulo: 'Previsão', subtitulo: 'O que os próximos meses já comprometem' },
  '/cartoes': { titulo: 'Cartões', subtitulo: 'Faturas, parcelas e limites' },
  '/taxas': { titulo: 'Taxas de juros', subtitulo: 'Médias de cada banco' },
  '/saude': { titulo: 'Saúde financeira', subtitulo: 'Quanto dá para gastar, guardar e parcelar' },
  '/objetivos': { titulo: 'Objetivos', subtitulo: 'O que a família quer alcançar e o caminho até lá' },
  '/dividas': { titulo: 'Dívidas', subtitulo: 'O que está devendo e o caminho mais barato para quitar' },
  '/credito': { titulo: 'Simular crédito', subtitulo: 'Qual banco sai mais barato para o que você precisa' },
  '/analises': { titulo: 'Análises', subtitulo: 'Quem gasta o quê, por quê e para onde está indo' },
  '/familia': { titulo: 'Família', subtitulo: 'Quem faz parte do orçamento' },
  '/categorias': { titulo: 'Categorias', subtitulo: 'Como os lançamentos são organizados' },
  '/assistente': { titulo: 'Assistente IA', subtitulo: 'Pergunte o que quiser sobre as finanças da família' },
  '/importar': { titulo: 'Importar documentos', subtitulo: 'Contracheques e notas fiscais viram lançamentos' },
  '/configuracoes': { titulo: 'Configurações', subtitulo: 'Conta, segurança, inteligência artificial e dados externos' }
}

const CABECALHO_PADRAO = { titulo: 'Projeto Financeiro', subtitulo: '' }

type ModalAberto =
  | { tipo: 'transacao' }
  | { tipo: 'compra'; cartaoId?: string }
  | { tipo: 'cartao' }
  | { tipo: 'recorrencia'; inicial?: Partial<CriarRecorrenciaEntrada> }
  | { tipo: 'confirmar'; transacao: TransacaoDTO }
  | { tipo: 'perfil' }
  | null

interface AcoesGlobais {
  novoLancamento: () => void
  novaCompra: (cartaoId?: string) => void
  novoCartao: () => void
  novaRecorrencia: (inicial?: Partial<CriarRecorrenciaEntrada>) => void
  confirmar: (transacao: TransacaoDTO) => void
  editarPerfil: () => void
}

// Permite que qualquer tela abra os formulários de cadastro.
const AcoesGlobaisContexto = createContext<AcoesGlobais | null>(null)

export function useAcoesGlobais() {
  const contexto = useContext(AcoesGlobaisContexto)
  if (!contexto) throw new Error('useAcoesGlobais precisa estar dentro de <Layout>')
  return contexto
}

export const useNovoLancamento = () => useAcoesGlobais().novoLancamento

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [modal, setModal] = useState<ModalAberto>(null)
  const fechar = () => setModal(null)
  const cabecalho = CABECALHOS[pathname] ?? CABECALHO_PADRAO

  const acoes = useMemo<AcoesGlobais>(
    () => ({
      novoLancamento: () => setModal({ tipo: 'transacao' }),
      novaCompra: (cartaoId) => setModal({ tipo: 'compra', cartaoId }),
      novoCartao: () => setModal({ tipo: 'cartao' }),
      novaRecorrencia: (inicial) => setModal({ tipo: 'recorrencia', inicial }),
      confirmar: (transacao) => setModal({ tipo: 'confirmar', transacao }),
      editarPerfil: () => setModal({ tipo: 'perfil' })
    }),
    []
  )

  return (
    <AcoesGlobaisContexto.Provider value={acoes}>
      <div className={estilos.layout}>
        <BarraLateral />
        <div className={estilos.principal}>
          <BarraSuperior {...cabecalho} aoNovoLancamento={acoes.novoLancamento} />
          <main className={estilos.conteudo} key={pathname}>
            {children}
          </main>
        </div>
      </div>

      <ModalTransacao
        aberto={modal?.tipo === 'transacao'}
        aoFechar={fechar}
        aoUsarCartao={() => acoes.novaCompra()}
        aoUsarRecorrente={() => acoes.novaRecorrencia()}
      />
      <ModalCompraCartao
        aberto={modal?.tipo === 'compra'}
        aoFechar={fechar}
        cartaoInicial={modal?.tipo === 'compra' ? modal.cartaoId : undefined}
      />
      <ModalCartao aberto={modal?.tipo === 'cartao'} aoFechar={fechar} />
      <ModalRecorrencia
        aberto={modal?.tipo === 'recorrencia'}
        aoFechar={fechar}
        inicial={modal?.tipo === 'recorrencia' ? modal.inicial : undefined}
      />
      <ModalPerfil aberto={modal?.tipo === 'perfil'} aoFechar={fechar} />
      <ModalConfirmar transacao={modal?.tipo === 'confirmar' ? modal.transacao : null} aoFechar={fechar} />
    </AcoesGlobaisContexto.Provider>
  )
}
