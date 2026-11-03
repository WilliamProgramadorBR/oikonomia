import { useEffect, useState, type FormEvent } from 'react'
import { Hash, Tag } from 'lucide-react'
import type { OfertaAvaliadaDTO, SituacaoOferta, TipoOferta } from '@compartilhado/dtos/aperto'
import { Botao } from '../../componentes/ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../../componentes/ui/Campo'
import { Modal } from '../../componentes/ui/Modal'
import { useAcao } from '../../hooks/useAcao'
import { apertoServico } from '../../servicos/apertoServico'
import { classes } from '../../utilitarios/classes'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from './Aperto.module.css'

export const TIPOS_OFERTA: Record<TipoOferta, { nome: string; valor: string; dica: string }> = {
  parcelar_fatura: {
    nome: 'Parcelar fatura',
    valor: 'Valor da fatura',
    dica: 'Veja no app do cartão as opções de parcelamento (sem confirmar) e cadastre cada uma com o mesmo grupo.'
  },
  credito_no_cartao: {
    nome: 'Conta no crédito',
    valor: 'Valor da conta',
    dica: 'Pagar aluguel ou boleto via Pix/boleto no crédito: a conta vai para a próxima fatura. Informe as parcelas já com a taxa.'
  },
  custo_zero: {
    nome: 'Custo zero',
    valor: 'Valor adiado',
    dica: 'Negociar a data com o credor, adiantamento salarial, ajuda da família... Sem juros: o valor fica para o mês seguinte.'
  },
  emprestimo: { nome: 'Empréstimo', valor: 'Valor recebido', dica: 'Empréstimo novo. O app avisa se for bem mais do que falta.' },
  refinanciamento: {
    nome: 'Refinanciamento',
    valor: 'Dinheiro recebido',
    dica: 'Renovar uma dívida existente recebendo dinheiro. Informe também a dívida antiga, para calcular o custo real.'
  },
  antecipacao_fgts: {
    nome: 'Antecipar FGTS',
    valor: 'Valor recebido',
    dica: 'Antecipação do saque-aniversário. O app sempre deixa isso como último caso.'
  }
}

interface Props {
  aberto: boolean
  aoFechar: () => void
  oferta?: OfertaAvaliadaDTO | null
  grupos: string[]
}

export function ModalOferta({ aberto, aoFechar, oferta, grupos }: Props) {
  const executar = useAcao()
  const [tipo, setTipo] = useState<TipoOferta>('parcelar_fatura')
  const [descricao, setDescricao] = useState('')
  const [grupo, setGrupo] = useState('')
  const [valor, setValor] = useState(0)
  const [parcelas, setParcelas] = useState('')
  const [parcela, setParcela] = useState(0)
  const [primeira, setPrimeira] = useState('0')
  const [saldoAntigo, setSaldoAntigo] = useState(0)
  const [parcelaAntiga, setParcelaAntiga] = useState(0)
  const [restantesAntigas, setRestantesAntigas] = useState('')
  const [situacao, setSituacao] = useState<SituacaoOferta>('avaliando')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setTipo(oferta?.tipo ?? 'parcelar_fatura')
    setDescricao(oferta?.descricao ?? '')
    setGrupo(oferta?.grupo ?? '')
    setValor(oferta?.valorCentavos ?? 0)
    setParcelas(oferta ? String(oferta.parcelas) : '')
    setParcela(oferta?.parcelaCentavos ?? 0)
    setPrimeira(String(oferta?.primeiraParcelaEmMeses ?? 0))
    setSaldoAntigo(oferta?.saldoSubstituidoCentavos ?? 0)
    setParcelaAntiga(oferta?.parcelaSubstituidaCentavos ?? 0)
    setRestantesAntigas(oferta?.parcelasSubstituidasRestantes ? String(oferta.parcelasSubstituidasRestantes) : '')
    setSituacao(oferta?.situacao ?? 'avaliando')
    setMotivo(oferta?.motivo ?? '')
  }, [aberto, oferta])

  // 1ª parcela: o parcelamento da fatura costuma cobrar já neste mês (R12); o crédito, na próxima fatura.
  function trocarTipo(novo: TipoOferta) {
    setTipo(novo)
    if (!oferta) setPrimeira(novo === 'parcelar_fatura' ? '0' : novo === 'refinanciamento' ? '2' : '1')
  }

  const info = TIPOS_OFERTA[tipo]
  const custoZero = tipo === 'custo_zero'
  const total = Number(parcelas) * parcela
  const custo = total - valor - (tipo === 'refinanciamento' ? saldoAntigo : 0)

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        apertoServico.salvarOferta({
          id: oferta?.id,
          tipo,
          descricao: descricao || info.nome,
          grupo: grupo || null,
          valorCentavos: valor,
          parcelas: Number(parcelas) || 1,
          parcelaCentavos: parcela,
          primeiraParcelaEmMeses: Number(primeira),
          saldoSubstituidoCentavos: saldoAntigo,
          parcelaSubstituidaCentavos: parcelaAntiga,
          parcelasSubstituidasRestantes: Number(restantesAntigas) || 0,
          situacao,
          motivo: motivo || null
        }),
      oferta ? 'Oferta atualizada.' : 'Oferta cadastrada. O plano foi recalculado.'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={oferta ? 'Editar oferta' : 'Nova oferta'}
      descricao="Cadastre cada saída que você tem, mesmo as que parecem ruins: o app compara todas pelo custo real."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-oferta" carregando={salvando}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-oferta" className={estilos.formulario} onSubmit={salvar}>
        <div className={estilos.tiposOferta}>
          {(Object.keys(TIPOS_OFERTA) as TipoOferta[]).map((t) => (
            <button key={t} type="button" className={classes(estilos.tipoOferta, t === tipo && estilos.tipoAtivo)} onClick={() => trocarTipo(t)}>
              {TIPOS_OFERTA[t].nome}
            </button>
          ))}
        </div>
        <p className={estilos.dica}>{info.dica}</p>
        <div className={estilos.linha}>
          <Campo rotulo="Descrição" placeholder={info.nome} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div>
            <Campo
              rotulo="Grupo (alternativas entre si)"
              icone={Tag}
              placeholder="Ex.: Fatura Nubank"
              list="grupos-aperto"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
            />
            <datalist id="grupos-aperto">
              {grupos.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
        </div>
        <CampoMoeda rotulo={info.valor} centavos={valor} aoAlterar={setValor} />
        {!custoZero && (
          <div className={estilos.linha3}>
            <Campo rotulo="Parcelas" icone={Hash} type="number" min={1} max={120} placeholder="Ex.: 3" value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
            <CampoMoeda rotulo="Valor da parcela" centavos={parcela} aoAlterar={setParcela} />
            <CampoSelecao rotulo="1ª parcela" value={primeira} onChange={(e) => setPrimeira(e.target.value)}>
              <option value="0">Neste mês</option>
              <option value="1">Mês que vem</option>
              <option value="2">Em 2 meses</option>
              <option value="3">Em 3 meses</option>
            </CampoSelecao>
          </div>
        )}
        {tipo === 'refinanciamento' && (
          <div className={estilos.linha3}>
            <CampoMoeda rotulo="Saldo da dívida antiga" centavos={saldoAntigo} aoAlterar={setSaldoAntigo} />
            <CampoMoeda rotulo="Parcela antiga" centavos={parcelaAntiga} aoAlterar={setParcelaAntiga} />
            <Campo rotulo="Parcelas que faltam" icone={Hash} type="number" min={0} value={restantesAntigas} onChange={(e) => setRestantesAntigas(e.target.value)} />
          </div>
        )}
        {!custoZero && total > 0 && valor > 0 && (
          <p className={classes(estilos.custo, custo > valor * 0.5 && estilos.custoAlto)}>
            Total pago {formatarCentavos(total)} · custo real <strong>{formatarCentavos(custo)}</strong> ({Math.round((custo / valor) * 100)}% do valor)
          </p>
        )}
        <div className={estilos.linha}>
          <CampoSelecao rotulo="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoOferta)}>
            <option value="avaliando">Disponível (considerar)</option>
            <option value="recusada">Recusei</option>
            <option value="indisponivel">Indisponível / negada</option>
          </CampoSelecao>
          <Campo rotulo="Motivo (opcional)" placeholder="Ex.: negado pelo banco" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
      </form>
    </Modal>
  )
}
