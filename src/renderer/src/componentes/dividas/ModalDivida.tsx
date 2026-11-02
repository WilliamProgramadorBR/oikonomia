import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { CalendarDays, Hash, Percent } from 'lucide-react'
import type { TipoDivida } from '@compartilhado/dtos/divida'
import { valorPresente } from '@compartilhado/financeiro/credito'
import { useVisao } from '../../contextos/VisaoContexto'
import { usePessoas, useTaxas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { dividaServico } from '../../servicos/dividaServico'
import { classes } from '../../utilitarios/classes'
import { TIPOS_DIVIDA, formatarTaxaCurta } from '../../utilitarios/dividas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { SeletorPessoa } from '../transacoes/Seletores'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Dividas.module.css'

const paraNumero = (texto: string) => Number(texto.replace(',', '.'))

export function ModalDivida({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { pessoaId: pessoaDaVisao } = useVisao()
  const { dados: pessoas } = usePessoas()
  const executar = useAcao()

  const [tipo, setTipo] = useState<TipoDivida>('emprestimo_pessoal')
  const [nome, setNome] = useState('')
  const [credor, setCredor] = useState('')
  const [taxa, setTaxa] = useState('')
  const [parcela, setParcela] = useState(0)
  const [restantes, setRestantes] = useState('')
  const [saldo, setSaldo] = useState(0)
  const [dia, setDia] = useState('')
  const [pessoaEscolhida, setPessoaEscolhida] = useState('')
  const [salvando, setSalvando] = useState(false)

  const info = TIPOS_DIVIDA[tipo]
  const { dados: taxasModalidade } = useTaxas(info.modalidade ?? undefined)
  const valoresMercado = info.modalidade ? (taxasModalidade?.taxas ?? []).map((t) => t.taxaMensal).sort((a, b) => a - b) : []
  const medianaMercado = valoresMercado.length ? valoresMercado[Math.floor(valoresMercado.length / 2)] : null

  useEffect(() => {
    if (!aberto) return
    setTipo('emprestimo_pessoal')
    setNome('')
    setCredor('')
    setTaxa('')
    setParcela(0)
    setRestantes('')
    setSaldo(0)
    setDia('')
    setPessoaEscolhida('')
  }, [aberto])

  const pessoaId = pessoaEscolhida || pessoaDaVisao || pessoas?.[0]?.id || ''
  const taxaNumero = paraNumero(taxa || String(medianaMercado ?? 0))
  const nRestantes = Number(restantes)
  const saldoCalculado =
    !info.semParcela && parcela > 0 && nRestantes > 0 && Number.isFinite(taxaNumero)
      ? Math.round(valorPresente(parcela, taxaNumero / 100, nRestantes))
      : null

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        dividaServico.criar({
          nome: nome || info.nome,
          tipo,
          credor,
          cnpj8: null,
          taxaMensal: taxaNumero,
          parcelaCentavos: info.semParcela ? 0 : parcela,
          parcelasRestantes: info.semParcela ? 0 : nRestantes,
          saldoDevedorCentavos: info.semParcela || saldo > 0 ? saldo : null,
          diaVencimento: Number(dia || 10),
          pessoaId
        }),
      'Dívida cadastrada. A parcela já entra na previsão dos próximos meses.'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Nova dívida"
      descricao="Empréstimos, financiamentos, cheque especial... Tudo o que está devendo fora do cartão."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-divida" carregando={salvando}>
            Cadastrar dívida
          </Botao>
        </>
      }
    >
      <form id="formulario-divida" className={estilos.formulario} onSubmit={salvar}>
        <div className={estilos.tipos}>
          {(Object.keys(TIPOS_DIVIDA) as TipoDivida[]).map((chave) => {
            const { nome: rotulo, icone: Icone, cor } = TIPOS_DIVIDA[chave]
            return (
              <button
                key={chave}
                type="button"
                className={classes(estilos.tipo, tipo === chave && estilos.tipoAtivo)}
                style={{ '--cor': cor } as CSSProperties}
                onClick={() => setTipo(chave)}
              >
                <Icone size={18} />
                <span>{rotulo}</span>
              </button>
            )
          })}
        </div>

        <div className={estilos.linha}>
          <Campo rotulo="Nome" placeholder={info.nome} value={nome} onChange={(e) => setNome(e.target.value)} />
          <Campo rotulo="Banco / credor" placeholder="Ex.: Banco do Brasil" value={credor} onChange={(e) => setCredor(e.target.value)} />
        </div>

        <div>
          <Campo
            rotulo="Taxa de juros (% ao mês)"
            icone={Percent}
            inputMode="decimal"
            placeholder={medianaMercado !== null ? String(medianaMercado).replace('.', ',') : 'Ex.: 3,5'}
            value={taxa}
            onChange={(e) => setTaxa(e.target.value)}
          />
          {medianaMercado !== null && (
            <p className={estilos.dica}>
              Mediana do mercado para {info.nome.toLowerCase()}: {formatarTaxaCurta(medianaMercado)} a.m. (Banco
              Central). Veja a taxa no contrato ou no aplicativo do banco; se deixar em branco, usamos a mediana.
            </p>
          )}
        </div>

        {info.semParcela ? (
          <CampoMoeda rotulo="Quanto deve hoje" centavos={saldo} aoAlterar={setSaldo} />
        ) : (
          <>
            <div className={estilos.linha}>
              <CampoMoeda rotulo="Valor da parcela" centavos={parcela} aoAlterar={setParcela} />
              <Campo
                rotulo="Parcelas que faltam"
                icone={Hash}
                type="number"
                min={1}
                placeholder="Ex.: 24"
                value={restantes}
                onChange={(e) => setRestantes(e.target.value)}
              />
            </div>
            <div>
              <CampoMoeda rotulo="Saldo devedor (opcional)" centavos={saldo} aoAlterar={setSaldo} />
              {saldoCalculado !== null && (
                <p className={estilos.dica}>
                  Pela parcela, prazo e taxa, o saldo para quitar hoje é cerca de{' '}
                  <strong>{formatarCentavos(saldoCalculado)}</strong>, e ainda serão pagos{' '}
                  <strong>{formatarCentavos(parcela * nRestantes - saldoCalculado)}</strong> de juros. Deixe zerado
                  para usar esse cálculo.
                </p>
              )}
            </div>
          </>
        )}

        <Campo
          rotulo="Dia do vencimento"
          icone={CalendarDays}
          type="number"
          min={1}
          max={31}
          placeholder="Ex.: 10"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
        />

        <SeletorPessoa rotulo="De quem é" pessoas={pessoas ?? []} valor={pessoaId} aoAlterar={setPessoaEscolhida} />
      </form>
    </Modal>
  )
}
