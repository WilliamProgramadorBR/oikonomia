import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { CreditCard, Repeat, Store, Users } from 'lucide-react'
import type { TipoTransacaoDTO } from '@compartilhado/dtos/transacao'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import { useVisao } from '../../contextos/VisaoContexto'
import { useCategorias, useObjetivos, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { transacaoServico } from '../../servicos/transacaoServico'
import { Alternador } from '../ui/Alternador'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../ui/Campo'
import { EstadoVazio } from '../ui/Elementos'
import { Modal } from '../ui/Modal'
import { SeletorCategoria, SeletorPessoa } from './Seletores'
import estilos from './Transacoes.module.css'

interface PropsModalTransacao {
  aberto: boolean
  aoFechar: () => void
  aoUsarCartao: () => void
  aoUsarRecorrente: () => void
}

const SUCESSO: Record<TipoTransacaoDTO, string> = {
  receita: 'Receita registrada',
  despesa: 'Despesa registrada',
  guardado: 'Valor guardado registrado'
}

export function ModalTransacao({ aberto, aoFechar, aoUsarCartao, aoUsarRecorrente }: PropsModalTransacao) {
  const { pessoaId: pessoaDaVisao } = useVisao()
  const { dados: pessoas } = usePessoas()
  const { dados: categorias } = useCategorias()
  const executar = useAcao()
  const navegar = useNavigate()

  const [tipo, setTipo] = useState<TipoTransacaoDTO>('despesa')
  const [valorCentavos, setValorCentavos] = useState(0)
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [pessoaEscolhida, setPessoaEscolhida] = useState('')
  const [data, setData] = useState(hojeISO())
  const [estabelecimento, setEstabelecimento] = useState('')
  const [objetivoId, setObjetivoId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { dados: objetivos } = useObjetivos()

  // Formulário limpo a cada abertura.
  useEffect(() => {
    if (!aberto) return
    setValorCentavos(0)
    setDescricao('')
    setCategoriaId('')
    setEstabelecimento('')
    setObjetivoId('')
    setPessoaEscolhida('')
    setData(hojeISO())
  }, [aberto])

  const pessoaId = pessoaEscolhida || pessoaDaVisao || pessoas?.[0]?.id || ''

  function trocarTipo(novo: TipoTransacaoDTO) {
    setTipo(novo)
    setCategoriaId('')
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        transacaoServico.criar({
          tipo,
          valorCentavos,
          descricao,
          categoriaId,
          pessoaId,
          data,
          estabelecimento: tipo === 'despesa' ? estabelecimento : undefined,
          objetivoId: tipo === 'guardado' && objetivoId ? objetivoId : null
        }),
      SUCESSO[tipo]
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  if (pessoas && pessoas.length === 0) {
    return (
      <Modal aberto={aberto} aoFechar={aoFechar} titulo="Novo lançamento">
        <EstadoVazio
          icone={Users}
          titulo="Cadastre sua família primeiro"
          descricao="Cada lançamento pertence a alguém. Adicione pelo menos uma pessoa para começar."
          acao={
            <Botao
              onClick={() => {
                aoFechar()
                navegar('/familia')
              }}
            >
              Ir para Família
            </Botao>
          }
        />
      </Modal>
    )
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo lançamento"
      descricao="Registre uma entrada ou saída de dinheiro."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-transacao" carregando={salvando}>
            Salvar lançamento
          </Botao>
        </>
      }
    >
      <form id="formulario-transacao" className={estilos.formulario} onSubmit={salvar}>
        <Alternador
          largo
          valor={tipo}
          aoAlterar={trocarTipo}
          opcoes={[
            { valor: 'despesa', rotulo: 'Despesa', cor: 'var(--despesa)' },
            { valor: 'receita', rotulo: 'Receita', cor: 'var(--receita)' },
            { valor: 'guardado', rotulo: 'Guardar', cor: 'var(--primaria)' }
          ]}
        />

        <div className={estilos.atalhos}>
          {tipo === 'despesa' && (
            <button type="button" className={estilos.atalhoCartao} onClick={aoUsarCartao}>
              <CreditCard size={16} />
              <span>
                Foi no <strong>cartão de crédito</strong>?
              </span>
            </button>
          )}
          <button type="button" className={estilos.atalhoCartao} onClick={aoUsarRecorrente}>
            <Repeat size={16} />
            <span>
              Se <strong>repete todo mês</strong>?
            </span>
          </button>
        </div>

        <CampoMoeda destaque autoFocus centavos={valorCentavos} aoAlterar={setValorCentavos} />

        <Campo
          rotulo="Descrição"
          placeholder={
            tipo === 'despesa'
              ? 'Ex.: Compra do mês'
              : tipo === 'receita'
                ? 'Ex.: Freela de design'
                : 'Ex.: Aporte na reserva'
          }
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <SeletorCategoria
          categorias={(categorias ?? []).filter((c) => c.tipo === tipo)}
          valor={categoriaId}
          aoAlterar={setCategoriaId}
        />

        {tipo === 'guardado' && (objetivos?.objetivos.length ?? 0) > 0 && (
          <CampoSelecao rotulo="Para qual objetivo? (opcional)" value={objetivoId} onChange={(e) => setObjetivoId(e.target.value)}>
            <option value="">Nenhum (só guardar)</option>
            {objetivos!.objetivos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </CampoSelecao>
        )}

        <SeletorPessoa pessoas={pessoas ?? []} valor={pessoaId} aoAlterar={setPessoaEscolhida} />

        <div className={estilos.linha}>
          <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          {tipo === 'despesa' && (
            <Campo
              rotulo="Onde (opcional)"
              icone={Store}
              placeholder="Ex.: Supermercado"
              value={estabelecimento}
              onChange={(e) => setEstabelecimento(e.target.value)}
            />
          )}
        </div>
      </form>
    </Modal>
  )
}
