import { useState, type CSSProperties } from 'react'
import { Archive, CheckCheck, FileUp, Plus, RefreshCw, TriangleAlert, Wallet, Wifi } from 'lucide-react'
import type { ContaDTO, PreviaImportacaoDTO } from '@compartilhado/dtos/conta'
import { ModalConferirSaldo, ModalImportarExtrato, ModalNovaConta } from '../../componentes/contas/ModaisConta'
import { Botao } from '../../componentes/ui/Botao'
import { Avatar, EstadoVazio, Esqueleto } from '../../componentes/ui/Elementos'
import { CASA } from '@compartilhado/constantes/casa'
import { useVisao } from '../../contextos/VisaoContexto'
import { useContas, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
import { useConsulta } from '../../hooks/useConsulta'
import { useNotificar } from '../../contextos/NotificacaoContexto'
import { openFinanceServico } from '../../servicos/openFinanceServico'
import { contaServico } from '../../servicos/contaServico'
import { marcaDe } from '../../utilitarios/bancos'
import { classes } from '../../utilitarios/classes'
import { TIPOS_CONTA } from '../../utilitarios/contas'
import { dataCurta } from '../../utilitarios/datas'
import { formatarCentavos } from '../../utilitarios/moeda'
import estilos from '../../componentes/contas/Contas.module.css'

const DIAS_PARA_CONFERIR = 15

export function Contas() {
  const { pessoaId } = useVisao()
  const { dados: contas } = useContas()
  const { dados: pessoas } = usePessoas()
  const [nova, setNova] = useState(false)
  const [conferindo, setConferindo] = useState<ContaDTO | null>(null)
  const [importando, setImportando] = useState<ContaDTO | null>(null)
  const [sincronizando, setSincronizando] = useState<{ conta: ContaDTO; previa: PreviaImportacaoDTO } | null>(null)
  const { dados: openFinance } = useConsulta(() => openFinanceServico.estado(), [])
  const executar = useAcao()
  const notificar = useNotificar()
  // Contas locais ligadas a uma conta do Open Finance (e quando foram sincronizadas).
  const vinculadas = new Map(
    (openFinance?.conexoes ?? []).flatMap((c) => c.contas.filter((r) => r.contaId).map((r) => [r.contaId!, { ultimaSincronizacao: r.ultimaSincronizacao, instituicao: c.instituicao }] as const))
  )

  async function sincronizar(conta: ContaDTO) {
    try {
      setSincronizando({ conta, previa: await openFinanceServico.sincronizar(conta.id) })
    } catch (e) {
      notificar('erro', (e as Error).message)
    }
  }

  if (!contas) return <Esqueleto altura={320} />

  // Visão de uma pessoa: as contas dela. Família: todas.
  const visiveis = contas.filter((c) => c.ativa && (!pessoaId || c.pessoaId === pessoaId))
  const total = visiveis.reduce((s, c) => s + c.saldoAtualCentavos, 0)
  const disponivel = visiveis.filter((c) => c.tipo !== 'investimento').reduce((s, c) => s + c.saldoAtualCentavos, 0)
  const desatualizadas = visiveis.filter((c) => (c.diasDesdeConferencia ?? 99) > DIAS_PARA_CONFERIR)
  const projecaoDisponivel = visiveis.filter((c) => c.tipo !== 'investimento').reduce((s, c) => s + c.projecao.saldoCentavos, 0)
  const ficamNegativas = visiveis.filter((c) => c.projecao.menorSaldo.valorCentavos < 0)

  return (
    <div className={estilos.pagina}>
      <div className={estilos.kpis}>
        <div className={estilos.kpi}>
          <span>Saldo total</span>
          <strong className={classes('numero', total < 0 && estilos.saiu)}>{formatarCentavos(total)}</strong>
          <small>{visiveis.length} conta(s)</small>
        </div>
        <div className={estilos.kpi}>
          <span>Disponível (sem investimentos)</span>
          <strong className={classes('numero', disponivel < 0 && estilos.saiu)}>{formatarCentavos(disponivel)}</strong>
          <small>
            projeção em {visiveis[0] ? dataCurta(visiveis[0].projecao.ate) : '—'}:{' '}
            <b className={classes('numero', projecaoDisponivel < 0 && estilos.saiu)}>{formatarCentavos(projecaoDisponivel)}</b>
          </small>
        </div>
        <div className={estilos.kpi}>
          <span>Para conferir</span>
          <strong>{desatualizadas.length === 0 ? 'Tudo em dia' : `${desatualizadas.length} conta(s)`}</strong>
          <small>conferidas há mais de {DIAS_PARA_CONFERIR} dias</small>
        </div>
        <Botao icone={Plus} onClick={() => setNova(true)}>
          Nova conta
        </Botao>
      </div>

      {ficamNegativas.length > 0 && (
        <p className={estilos.alertaNegativo}>
          <TriangleAlert size={17} />
          {ficamNegativas
            .map((c) => `${c.nome} fica negativa em ${dataCurta(c.projecao.menorSaldo.data)} (${formatarCentavos(c.projecao.menorSaldo.valorCentavos)})`)
            .join('; ')}
          . Antecipe uma transferência ou mude a data de alguma conta.
        </p>
      )}

      {visiveis.length === 0 ? (
        <EstadoVazio
          icone={Wallet}
          titulo="Nenhuma conta cadastrada"
          descricao="Cadastre suas contas com o saldo de hoje. Depois, importe o extrato (OFX ou CSV) para o app conferir tudo sozinho."
          acao={
            <Botao icone={Plus} onClick={() => setNova(true)}>
              Adicionar conta
            </Botao>
          }
        />
      ) : (
        <div className={estilos.grade}>
          {visiveis.map((c) => (
            <CartaoConta
              key={c.id}
              conta={c}
              dono={pessoas?.find((p) => p.id === c.pessoaId)}
              aoConferir={() => setConferindo(c)}
              aoImportar={() => setImportando(c)}
              openFinance={vinculadas.get(c.id)}
              aoSincronizar={() => sincronizar(c)}
            />
          ))}
        </div>
      )}

      <ModalNovaConta aberto={nova} aoFechar={() => setNova(false)} />
      <ModalConferirSaldo conta={conferindo} aoFechar={() => setConferindo(null)} />
      <ModalImportarExtrato conta={importando} aoFechar={() => setImportando(null)} />
      <ModalImportarExtrato
        conta={sincronizando?.conta ?? null}
        previaInicial={sincronizando?.previa ?? null}
        aoFechar={() => setSincronizando(null)}
        aoImportar={async () => {
          if (sincronizando) await executar(() => openFinanceServico.concluirSincronizacao(sincronizando.conta.id))
        }}
      />
    </div>
  )
}

interface PropsCartaoConta {
  conta: ContaDTO
  dono?: { nome: string; cor: string }
  aoConferir: () => void
  aoImportar: () => void
  openFinance?: { instituicao: string; ultimaSincronizacao: string | null }
  aoSincronizar: () => Promise<void>
}

function CartaoConta({ conta, dono, aoConferir, aoImportar, openFinance, aoSincronizar }: PropsCartaoConta) {
  const executar = useAcao()
  const [buscando, setBuscando] = useState(false)
  const marca = marcaDe(conta.instituicao, conta.cnpj8)
  const Icone = TIPOS_CONTA[conta.tipo].icone
  const atrasada = (conta.diasDesdeConferencia ?? 99) > DIAS_PARA_CONFERIR

  return (
    <article
      className={estilos.conta}
      style={{ '--fundo1': marca?.fundo[0] ?? '#6366f1', '--fundo2': marca?.fundo[1] ?? '#4338ca', '--texto-faixa': marca?.texto ?? '#fff' } as CSSProperties}
    >
      <div className={estilos.faixa}>
        <Icone size={18} />
        <span>{marca?.nome ?? (conta.instituicao || TIPOS_CONTA[conta.tipo].nome)}</span>
        <small>{TIPOS_CONTA[conta.tipo].nome}</small>
      </div>
      <div className={estilos.corpoConta}>
        <div className={estilos.nomeConta}>
          <strong>{conta.nome}</strong>
          <span className={estilos.dono}>
            {dono ? <Avatar nome={dono.nome} cor={dono.cor} tamanho={20} /> : <Avatar nome={CASA.nome} cor={CASA.cor} tamanho={20} casa />}
            {dono?.nome ?? 'Da casa'}
          </span>
        </div>
        <strong className={classes('numero', estilos.saldoConta, conta.saldoAtualCentavos < 0 && estilos.saiu)}>
          {formatarCentavos(conta.saldoAtualCentavos)}
        </strong>
        <div className={classes(estilos.projecao, conta.projecao.menorSaldo.valorCentavos < 0 && estilos.projecaoNegativa)}>
          <span>
            Em {dataCurta(conta.projecao.ate)}
            <small> · {conta.projecao.previstos} previsto(s)</small>
          </span>
          <strong className="numero">{formatarCentavos(conta.projecao.saldoCentavos)}</strong>
          {conta.projecao.menorSaldo.valorCentavos < 0 && (
            <em>
              Fica negativa em {dataCurta(conta.projecao.menorSaldo.data)}: {formatarCentavos(conta.projecao.menorSaldo.valorCentavos)}
            </em>
          )}
        </div>
        <span className={classes(estilos.referencia, atrasada && estilos.atrasada)}>
          {conta.referencia
            ? `Conferido em ${dataCurta(conta.referencia.data)} (${conta.referencia.origem === 'extrato' ? 'extrato' : 'informado'}) · ${conta.movimentosDesdeReferencia} lançamento(s) desde então`
            : 'Sem saldo conferido'}
        </span>
        {openFinance && (
          <span className={estilos.openFinance}>
            <Wifi size={12} /> Open Finance ({openFinance.instituicao})
            {openFinance.ultimaSincronizacao ? ` · sincronizada em ${dataCurta(openFinance.ultimaSincronizacao)}` : ' · ainda não sincronizada'}
          </span>
        )}
        <div className={estilos.acoesConta}>
          {openFinance && (
            <Botao
              tamanho="p"
              icone={RefreshCw}
              carregando={buscando}
              onClick={async () => {
                setBuscando(true)
                await aoSincronizar()
                setBuscando(false)
              }}
            >
              Sincronizar
            </Botao>
          )}
          <Botao tamanho="p" variante="secundario" icone={CheckCheck} onClick={aoConferir}>
            Conferir saldo
          </Botao>
          <Botao tamanho="p" variante="secundario" icone={FileUp} onClick={aoImportar}>
            Importar extrato
          </Botao>
          <button
            type="button"
            className={estilos.arquivar}
            title="Arquivar conta (some da lista; o histórico continua)"
            onClick={() => executar(() => contaServico.arquivar(conta.id), `"${conta.nome}" arquivada`)}
          >
            <Archive size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}
