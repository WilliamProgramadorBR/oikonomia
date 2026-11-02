import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import type { PrioridadeObjetivo, TipoObjetivo } from '@compartilhado/dtos/objetivo'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { useAcao } from '../../hooks/useAcao'
import { objetivoServico } from '../../servicos/objetivoServico'
import { classes } from '../../utilitarios/classes'
import { nomeDoMes } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import { TIPOS_OBJETIVO } from '../../utilitarios/objetivos'
import { Alternador } from '../ui/Alternador'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Objetivos.module.css'

const PRAZOS = Array.from({ length: 120 }, (_, k) => deslocarMes(mesAtual(), k + 1))

const DICAS: Partial<Record<TipoObjetivo, string>> = {
  reserva:
    'A reserva cobre imprevistos (perda de renda, saúde, conserto). Deixe em aplicação de resgate imediato.',
  casa: 'Para financiamento, junte a entrada aqui. Na fase de dívidas e financiamentos, o app vai comparar bancos pela taxa e pelo prazo.',
  quitar_divida:
    'Informe o total da dívida. Quitar dívida cara costuma ser o melhor "investimento": é juro que você deixa de pagar.'
}

interface PropsModalObjetivo {
  aberto: boolean
  aoFechar: () => void
  sugestaoReserva: number
}

export function ModalObjetivo({ aberto, aoFechar, sugestaoReserva }: PropsModalObjetivo) {
  const executar = useAcao()
  const [tipo, setTipo] = useState<TipoObjetivo>('reserva')
  const [nome, setNome] = useState(TIPOS_OBJETIVO.reserva.nome)
  const [nomeEditado, setNomeEditado] = useState(false)
  const [valorAlvo, setValorAlvo] = useState(0)
  const [valorInicial, setValorInicial] = useState(0)
  const [dataAlvo, setDataAlvo] = useState(PRAZOS[11])
  const [prioridade, setPrioridade] = useState<PrioridadeObjetivo>(2)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setTipo('reserva')
    setNome(TIPOS_OBJETIVO.reserva.nome)
    setNomeEditado(false)
    setValorAlvo(0)
    setValorInicial(0)
    setDataAlvo(PRAZOS[11])
    setPrioridade(1)
  }, [aberto])

  function escolherTipo(novo: TipoObjetivo) {
    setTipo(novo)
    if (!nomeEditado) setNome(TIPOS_OBJETIVO[novo].nome)
    setPrioridade(novo === 'reserva' || novo === 'quitar_divida' ? 1 : 2)
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        objetivoServico.criar({
          nome,
          tipo,
          valorAlvoCentavos: valorAlvo,
          valorInicialCentavos: valorInicial,
          dataAlvo,
          prioridade,
          pessoaId: null
        }),
      'Objetivo criado. Veja o plano sugerido.'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo objetivo"
      descricao="Diga o que quer alcançar e até quando. O app monta um plano realista com base no seu orçamento."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-objetivo" carregando={salvando}>
            Criar objetivo
          </Botao>
        </>
      }
    >
      <form id="formulario-objetivo" className={estilos.formulario} onSubmit={salvar}>
        <div className={estilos.tipos}>
          {(Object.keys(TIPOS_OBJETIVO) as TipoObjetivo[]).map((chave) => {
            const { nome: rotulo, icone: Icone, cor } = TIPOS_OBJETIVO[chave]
            return (
              <button
                key={chave}
                type="button"
                className={classes(estilos.tipo, tipo === chave && estilos.tipoAtivo)}
                style={{ '--cor': cor } as CSSProperties}
                onClick={() => escolherTipo(chave)}
              >
                <Icone size={20} />
                <span>{rotulo}</span>
              </button>
            )
          })}
        </div>
        {DICAS[tipo] && <p className={estilos.dica}>{DICAS[tipo]}</p>}

        <Campo
          rotulo="Nome"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setNomeEditado(true)
          }}
        />

        <div>
          <CampoMoeda rotulo="Quanto precisa" centavos={valorAlvo} aoAlterar={setValorAlvo} />
          {tipo === 'reserva' && sugestaoReserva > 0 && (
            <button type="button" className={estilos.sugestao} onClick={() => setValorAlvo(sugestaoReserva)}>
              <Sparkles size={14} /> Usar a sugestão pelo seu perfil: {formatarCentavos(sugestaoReserva)}
            </button>
          )}
        </div>

        <div className={estilos.linha}>
          <CampoMoeda rotulo="Quanto já tem" centavos={valorInicial} aoAlterar={setValorInicial} />
          <CampoSelecao rotulo="Até quando" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)}>
            {PRAZOS.map((mes) => (
              <option key={mes} value={mes}>
                {nomeDoMes(mes)}
              </option>
            ))}
          </CampoSelecao>
        </div>

        <div className={estilos.pergunta}>
          <span className={estilos.rotulo}>Prioridade</span>
          <Alternador
            largo
            valor={String(prioridade) as '1' | '2' | '3'}
            aoAlterar={(v) => setPrioridade(Number(v) as PrioridadeObjetivo)}
            opcoes={[
              { valor: '1', rotulo: 'Alta' },
              { valor: '2', rotulo: 'Média' },
              { valor: '3', rotulo: 'Baixa' }
            ]}
          />
          <p className={estilos.dica}>
            A folga do orçamento vai primeiro para os objetivos de prioridade mais alta. Quando um
            termina, o aporte passa para o próximo.
          </p>
        </div>
      </form>
    </Modal>
  )
}
