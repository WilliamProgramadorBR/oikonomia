import { useEffect, useState, type FormEvent } from 'react'
import type { TransacaoDTO } from '@compartilhado/dtos/transacao'
import { useAcao } from '../../hooks/useAcao'
import { ajustesServico } from '../../servicos/ajustesServico'
import { Marcador } from '../acesso/CamposAcesso'
import { Alternador } from '../ui/Alternador'
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
  const [modo, setModo] = useState<'confirmar' | 'ajustar'>('confirmar')
  const [motivo, setMotivo] = useState('')
  const [naoAcontece, setNaoAcontece] = useState(false)

  useEffect(() => {
    if (!transacao) return
    setValorCentavos(transacao.valorCentavos)
    setData(transacao.data)
    setModo('confirmar')
    setMotivo(transacao.ajuste ?? '')
    setNaoAcontece(false)
  }, [transacao])

  if (!transacao) return null

  // Ajustar: o mês vai ser diferente do normal, mas ainda não aconteceu (ex.: salário das férias).
  const podeAjustar = !!transacao.recorrenciaId && transacao.status === 'prevista'

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok =
      modo === 'ajustar'
        ? await executar(
            () => ajustesServico.ajustarPrevista({ id: transacao!.id, valorCentavos: naoAcontece ? 0 : valorCentavos, motivo }),
            naoAcontece ? `"${transacao!.descricao}" fora deste mês (${motivo})` : `Previsão de "${transacao!.descricao}" ajustada`
          )
        : await executar(
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
          <Botao
            type="submit"
            form="formulario-confirmar"
            carregando={salvando}
            disabled={modo === 'ajustar' && (!motivo.trim() || (!naoAcontece && valorCentavos <= 0))}
          >
            {modo === 'ajustar' ? 'Salvar ajuste' : 'Confirmar'}
          </Botao>
        </>
      }
    >
      <form id="formulario-confirmar" className={estilos.formulario} onSubmit={confirmar}>
        {podeAjustar && (
          <Alternador
            largo
            valor={modo}
            aoAlterar={setModo}
            opcoes={[
              { valor: 'confirmar', rotulo: 'Já aconteceu' },
              { valor: 'ajustar', rotulo: 'Vai ser diferente' }
            ]}
          />
        )}
        <p className={estilos.previsto}>
          Previsto: <strong className="numero">{formatarCentavos(transacao.valorCentavos)}</strong>
          {diferenca !== 0 && (
            <span className={diferencaBoa ? estilos.abaixo : estilos.acima}>
              {diferenca > 0 ? '+' : '−'} {formatarCentavos(Math.abs(diferenca))}{' '}
              {diferenca > 0 ? 'acima' : 'abaixo'} do previsto
            </span>
          )}
        </p>
        {modo === 'ajustar' && (
          <Marcador marcado={naoAcontece} aoAlterar={setNaoAcontece}>
            Não vai acontecer neste mês
          </Marcador>
        )}
        {!(modo === 'ajustar' && naoAcontece) && (
          <CampoMoeda destaque autoFocus centavos={valorCentavos} aoAlterar={setValorCentavos} />
        )}
        {modo === 'confirmar' ? (
          <Campo rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        ) : (
          <Campo
            rotulo="Motivo"
            placeholder="Ex.: Férias, licença, mês sem plantão"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        )}
        {modo === 'ajustar' && (
          <p className={estilos.dicaAjuste}>Só este mês muda. A previsão dos outros meses e a média da conta continuam normais.</p>
        )}
      </form>
    </Modal>
  )
}
