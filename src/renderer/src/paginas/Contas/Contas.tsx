import { useState, type CSSProperties } from 'react'
import { Archive, CheckCheck, FileUp, Plus, Wallet } from 'lucide-react'
import type { ContaDTO } from '@compartilhado/dtos/conta'
import { ModalConferirSaldo, ModalImportarExtrato, ModalNovaConta } from '../../componentes/contas/ModaisConta'
import { Botao } from '../../componentes/ui/Botao'
import { Avatar, EstadoVazio, Esqueleto } from '../../componentes/ui/Elementos'
import { CASA } from '@compartilhado/constantes/casa'
import { useVisao } from '../../contextos/VisaoContexto'
import { useContas, usePessoas } from '../../hooks/consultas'
import { useAcao } from '../../hooks/useAcao'
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

  if (!contas) return <Esqueleto altura={320} />

  // Visão de uma pessoa: as contas dela. Família: todas.
  const visiveis = contas.filter((c) => c.ativa && (!pessoaId || c.pessoaId === pessoaId))
  const total = visiveis.reduce((s, c) => s + c.saldoAtualCentavos, 0)
  const disponivel = visiveis.filter((c) => c.tipo !== 'investimento').reduce((s, c) => s + c.saldoAtualCentavos, 0)
  const desatualizadas = visiveis.filter((c) => (c.diasDesdeConferencia ?? 99) > DIAS_PARA_CONFERIR)

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
          <small>corrente, poupança e carteira</small>
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
            />
          ))}
        </div>
      )}

      <ModalNovaConta aberto={nova} aoFechar={() => setNova(false)} />
      <ModalConferirSaldo conta={conferindo} aoFechar={() => setConferindo(null)} />
      <ModalImportarExtrato conta={importando} aoFechar={() => setImportando(null)} />
    </div>
  )
}

interface PropsCartaoConta {
  conta: ContaDTO
  dono?: { nome: string; cor: string }
  aoConferir: () => void
  aoImportar: () => void
}

function CartaoConta({ conta, dono, aoConferir, aoImportar }: PropsCartaoConta) {
  const executar = useAcao()
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
        <span className={classes(estilos.referencia, atrasada && estilos.atrasada)}>
          {conta.referencia
            ? `Conferido em ${dataCurta(conta.referencia.data)} (${conta.referencia.origem === 'extrato' ? 'extrato' : 'informado'}) · ${conta.movimentosDesdeReferencia} lançamento(s) desde então`
            : 'Sem saldo conferido'}
        </span>
        <div className={estilos.acoesConta}>
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
