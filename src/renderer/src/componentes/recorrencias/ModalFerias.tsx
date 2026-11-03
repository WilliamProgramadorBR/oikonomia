import { useEffect, useState } from 'react'
import { CalendarDays, Info, Palmtree } from 'lucide-react'
import type { PlanoFeriasDTO } from '@compartilhado/dtos/ajustes'
import type { RecorrenciaDTO } from '@compartilhado/dtos/recorrencia'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { Marcador } from '../acesso/CamposAcesso'
import { useAcao } from '../../hooks/useAcao'
import { ajustesServico } from '../../servicos/ajustesServico'
import { classes } from '../../utilitarios/classes'
import { dataCurta, nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { Alternador } from '../ui/Alternador'
import { Botao } from '../ui/Botao'
import { Campo } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Recorrencias.module.css'

const DIAS = [30, 20, 15, 10] as const

interface PropsModalFerias {
  recorrencia: RecorrenciaDTO | null // conta recorrente do salário
  aoFechar: () => void
}

// Férias CLT: o pagamento chega antes e o holerite seguinte vem menor (ou zerado).
export function ModalFerias({ recorrencia, aoFechar }: PropsModalFerias) {
  const executar = useAcao()
  const [inicio, setInicio] = useState(`${deslocarMes(mesAtual(), 1)}-01`)
  const [dias, setDias] = useState<number>(30)
  const [vender, setVender] = useState(false)
  const [mesSeguinte, setMesSeguinte] = useState(true)
  const [jaLancado, setJaLancado] = useState(false)
  const [plano, setPlano] = useState<PlanoFeriasDTO | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Vender 10 dias deixa no máximo 20 de descanso.
  useEffect(() => {
    if (vender && dias > 20) setDias(20)
  }, [vender, dias])

  // Prévia ao vivo: cada mudança recalcula o plano no backend.
  useEffect(() => {
    if (!recorrencia) return
    let ativo = true
    ajustesServico
      .simularFerias({ recorrenciaId: recorrencia.id, inicio, diasDescanso: dias, venderDias: vender, pagamentoNoMesSeguinte: mesSeguinte })
      .then((p) => ativo && (setPlano(p), setErro(null)))
      .catch((e: Error) => ativo && (setPlano(null), setErro(e.message)))
    return () => {
      ativo = false
    }
  }, [recorrencia, inicio, dias, vender, mesSeguinte])

  if (!recorrencia) return null

  async function aplicar() {
    setSalvando(true)
    const ok = await executar(
      () =>
        ajustesServico.aplicarFerias({
          recorrenciaId: recorrencia!.id,
          inicio,
          diasDescanso: dias,
          venderDias: vender,
          pagamentoNoMesSeguinte: mesSeguinte,
          adiantamentoJaLancado: jaLancado
        }),
      'Férias registradas na previsão'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={`Férias: ${recorrencia.descricao}`}
      descricao="O pagamento das férias chega antes de começar, e o salário seguinte vem só com os dias trabalhados."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao icone={Palmtree} carregando={salvando} disabled={!plano} onClick={aplicar}>
            Registrar férias
          </Botao>
        </>
      }
    >
      <div className={estilos.formulario}>
        <div className={estilos.linha}>
          <Campo rotulo="Primeiro dia de férias" icone={CalendarDays} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <div className={estilos.campoAlternador}>
            <span className={estilos.rotulo}>Dias de descanso</span>
            <Alternador
              largo
              valor={String(dias)}
              aoAlterar={(v) => setDias(Number(v))}
              opcoes={DIAS.filter((d) => !vender || d <= 20).map((d) => ({ valor: String(d), rotulo: `${d}` }))}
            />
          </div>
        </div>

        <div className={estilos.opcoesFerias}>
          <Marcador marcado={vender} aoAlterar={setVender}>
            Vender 10 dias (abono pecuniário)
          </Marcador>
          <Marcador marcado={mesSeguinte} aoAlterar={setMesSeguinte}>
            Meu salário cai no mês seguinte ao trabalhado (5º dia útil)
          </Marcador>
          <Marcador marcado={jaLancado} aoAlterar={setJaLancado}>
            O pagamento das férias já entrou e já está lançado
          </Marcador>
        </div>

        {erro && <p className={estilos.erroFerias}>{erro}</p>}

        {plano && (
          <div className={estilos.planoFerias}>
            <div className={estilos.linhaPlano}>
              <div>
                <strong>Pagamento das férias</strong>
                <span>
                  {dataCurta(plano.dataAdiantamento)} · {plano.valorAbonoCentavos > 0 ? 'férias + 1/3 e abono' : 'férias + 1/3'}
                </span>
              </div>
              <strong className={classes('numero', estilos.positivo)}>+ {formatarCentavos(plano.adiantamentoCentavos)}</strong>
            </div>
            {plano.holerites.map((h) => (
              <div key={h.mesPagamento} className={estilos.linhaPlano}>
                <div>
                  <strong>Salário de {nomeDoMes(h.mesPagamento).toLowerCase()}</strong>
                  <span>
                    {h.diasTrabalhados} dia{h.diasTrabalhados === 1 ? '' : 's'} trabalhado{h.diasTrabalhados === 1 ? '' : 's'} em{' '}
                    {nomeDoMes(h.mesTrabalhado).toLowerCase()}
                    {h.situacao === 'ja_confirmado' && ' · já confirmado, não muda'}
                    {h.situacao === 'sem_ocorrencia' && ' · fora do período da conta'}
                  </span>
                </div>
                <span className={estilos.valoresPlano}>
                  <s className="numero">{formatarCentavos(h.valorNormalCentavos)}</s>
                  <strong className="numero">{formatarCentavos(h.valorComFeriasCentavos)}</strong>
                </span>
              </div>
            ))}
            <p className={estilos.dicaFerias}>
              <Info size={15} /> {plano.explicacao} Volta ao trabalho em {dataCurta(plano.retorno)}.
            </p>
            <p className={estilos.notaFerias}>
              Valores estimados a partir do salário líquido cadastrado. Quando o recibo de férias chegar, confirme o valor real.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
