import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Banknote, CalendarDays } from 'lucide-react'
import type { CriarRecorrenciaEntrada } from '@compartilhado/dtos/recorrencia'
import type { TipoTransacaoDTO } from '@compartilhado/dtos/transacao'
import { deslocarMes, mesAtual } from '@compartilhado/utilitarios/mes'
import { useVisao } from '../../contextos/VisaoContexto'
import { useCartoes, useCategorias, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { recorrenciaServico } from '../../servicos/recorrenciaServico'
import { classes } from '../../utilitarios/classes'
import { nomeDoMes } from '../../utilitarios/datas'
import { SeletorCategoria, SeletorDestino } from '../transacoes/Seletores'
import { Alternador } from '../ui/Alternador'
import { Botao } from '../ui/Botao'
import { Campo, CampoMoeda, CampoSelecao } from '../ui/Campo'
import { Modal } from '../ui/Modal'
import estilos from './Recorrencias.module.css'

const MESES_INICIO = Array.from({ length: 12 }, (_, k) => k)

interface PropsModalRecorrencia {
  aberto: boolean
  aoFechar: () => void
  inicial?: Partial<CriarRecorrenciaEntrada> // ex.: vindo de um hábito detectado nas análises
}

export function ModalRecorrencia({ aberto, aoFechar, inicial }: PropsModalRecorrencia) {
  const { pessoaId: pessoaDaVisao } = useVisao()
  const { dados: pessoas } = usePessoas()
  const { dados: categorias } = useCategorias()
  const { dados: cartoes } = useCartoes()
  const executar = useAcao()

  const [tipo, setTipo] = useState<TipoTransacaoDTO>('despesa')
  const [descricao, setDescricao] = useState('')
  const [valorVariavel, setValorVariavel] = useState(false)
  const [valorCentavos, setValorCentavos] = useState(0)
  const [diaDoMes, setDiaDoMes] = useState('')
  const [cartaoId, setCartaoId] = useState<string | null>(null)
  const [categoriaId, setCategoriaId] = useState('')
  const [pessoaEscolhida, setPessoaEscolhida] = useState<string | null | undefined>(undefined)
  const [inicio, setInicio] = useState(mesAtual())
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setTipo(inicial?.tipo ?? 'despesa')
    setDescricao(inicial?.descricao ?? '')
    setValorVariavel(inicial?.valorVariavel ?? false)
    setValorCentavos(inicial?.valorCentavos ?? 0)
    setDiaDoMes(inicial?.diaDoMes ? String(inicial.diaDoMes) : '')
    setCartaoId(inicial?.cartaoId ?? null)
    setCategoriaId(inicial?.categoriaId ?? '')
    setPessoaEscolhida(inicial?.pessoaId)
    setInicio(inicial?.inicio ?? mesAtual())
  }, [aberto, inicial])

  const pessoaId = pessoaEscolhida !== undefined ? pessoaEscolhida : (pessoaDaVisao ?? null)

  function trocarTipo(novo: TipoTransacaoDTO) {
    setTipo(novo)
    setCategoriaId('')
    if (novo !== 'despesa') setCartaoId(null)
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    const ok = await executar(
      () =>
        recorrenciaServico.criar({
          descricao,
          tipo,
          valorVariavel,
          valorCentavos,
          diaDoMes: Number(diaDoMes),
          categoriaId,
          pessoaId,
          cartaoId,
          inicio
        }),
      'Conta recorrente cadastrada. As previsões dos próximos meses já foram criadas.'
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Nova conta recorrente"
      descricao="Algo que se repete todo mês. O app cria a previsão de cada mês e você confirma o valor real."
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-recorrencia" carregando={salvando}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-recorrencia" className={estilos.formulario} onSubmit={salvar}>
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

        <Campo
          rotulo="Descrição"
          autoFocus
          placeholder={
            tipo === 'despesa' ? 'Ex.: Conta de luz' : tipo === 'receita' ? 'Ex.: Salário' : 'Ex.: Aporte na reserva'
          }
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <div className={estilos.bloco}>
          <span className={estilos.rotulo}>O valor muda todo mês?</span>
          <Alternador
            largo
            valor={valorVariavel ? 'variavel' : 'fixo'}
            aoAlterar={(v) => setValorVariavel(v === 'variavel')}
            opcoes={[
              { valor: 'fixo', rotulo: 'Valor fixo' },
              { valor: 'variavel', rotulo: 'Valor variável' }
            ]}
          />
        </div>

        <div className={estilos.linha}>
          <CampoMoeda
            rotulo={valorVariavel ? 'Valor médio (estimativa)' : 'Valor'}
            centavos={valorCentavos}
            aoAlterar={setValorCentavos}
          />
          <Campo
            rotulo={tipo === 'receita' ? 'Dia que cai' : 'Dia do vencimento'}
            icone={CalendarDays}
            type="number"
            min={1}
            max={31}
            placeholder="Ex.: 10"
            value={diaDoMes}
            onChange={(e) => setDiaDoMes(e.target.value)}
          />
        </div>
        {valorVariavel && (
          <p className={estilos.dica}>
            A cada valor real que você confirmar, a estimativa dos próximos meses se ajusta (os meses
            mais recentes pesam mais).
          </p>
        )}

        {tipo === 'despesa' && (
          <div className={estilos.bloco}>
            <span className={estilos.rotulo}>Como é paga</span>
            <div className={estilos.formas}>
              <button
                type="button"
                className={classes(estilos.forma, cartaoId === null && estilos.formaAtiva)}
                onClick={() => setCartaoId(null)}
              >
                <Banknote size={16} /> Boleto, débito ou Pix
              </button>
              {cartoes?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={classes(estilos.forma, cartaoId === c.id && estilos.formaAtiva)}
                  style={{ '--cor': c.cor } as CSSProperties}
                  onClick={() => setCartaoId(c.id)}
                >
                  <span className={estilos.miniCartao} /> {c.apelido}
                </button>
              ))}
            </div>
            {cartaoId && (
              <p className={estilos.dica}>
                Cobrada no cartão: entra na fatura do mês seguinte ao fechamento e conta uma vez só,
                no vencimento da fatura.
              </p>
            )}
          </div>
        )}

        <SeletorCategoria
          categorias={(categorias ?? []).filter((c) => c.tipo === tipo)}
          valor={categoriaId}
          aoAlterar={setCategoriaId}
        />

        <SeletorDestino pessoas={pessoas ?? []} valor={pessoaId} aoAlterar={setPessoaEscolhida} />

        <CampoSelecao rotulo="A partir de" value={inicio} onChange={(e) => setInicio(e.target.value)}>
          {MESES_INICIO.map((k) => {
            const mes = deslocarMes(mesAtual(), k)
            return (
              <option key={mes} value={mes}>
                {nomeDoMes(mes)}
              </option>
            )
          })}
        </CampoSelecao>
      </form>
    </Modal>
  )
}
