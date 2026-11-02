import { useEffect, useState, type FormEvent } from 'react'
import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import { useAcao } from '../../hooks/useAcao'
import { transacaoServico } from '../../servicos/transacaoServico'
import { formatarCentavos } from '../../utilitarios/moeda'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Transacoes.module.css'

interface PropsModalConfirmar {
  transacao: TransacaoDTO | null
  aoFechar: () => void
}

// A conta chegou: informa o valor real. Contas variáveis aprendem com isso.
export function ModalConfirmar({ transacao, aoFechar }: PropsModalConfirmar) {
  const executar = useAcao()
  const [valorCentavos, setValorCentavos] = useState(0)
  const [data, setData] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!transacao) return
    setValorCentavos(transacao.valorCentavos)
    setData(transacao.data)
  }, [transacao])

  if (!transacao) return null

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () => transacaoServico.confirmar({ id: transacao!.id, valorCentavos, data }),
      `"${transacao!.descricao}" confirmado`
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  async function pular() {
    const ok = await executar(
      () => transacaoServico.remover(transacao!.id),
      `"${transacao!.descricao}" não acontece neste mês`
    )
    if (ok) aoFechar()
  }

  const diferenca = valorCentavos - transacao.valorCentavos
  // Receita acima do previsto é boa notícia; despesa acima do previsto, não.
  const diferencaBoa = transacao.tipo === 'despesa' ? diferenca < 0 : diferenca > 0

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={`Confirmar: ${transacao.descricao}`}
      descricao="Informe o valor real. O app usa isso para prever melhor os próximos meses."
      rodape={
        <>
          <Botao variante="fantasma" onClick={pular}>
            Não houve este mês
          </Botao>
          <Botao type="submit" form="formulario-confirmar" carregando={salvando}>
            Confirmar
          </Botao>
        </>
      }
    >
      <form id="formulario-confirmar" className={estilos.formulario} onSubmit={confirmar}>
        <p className={estilos.previsto}>
          Previsto: <strong className="numero">{formatarCentavos(transacao.valorCentavos)}</strong>
          {diferenca !== 0 && (
            <span className={diferencaBoa ? estilos.abaixo : estilos.acima}>
              {diferenca > 0 ? '+' : '−'} {formatarCentavos(Math.abs(diferenca))}{' '}
              {diferenca > 0 ? 'acima' : 'abaixo'} do previsto
            </span>
          )}
        </p>
        <CampoMoeda destaque autoFocus centavos={valorCentavos} aoAlterar={setValorCentavos} />
        <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </form>
    </Modal>
  )
}
