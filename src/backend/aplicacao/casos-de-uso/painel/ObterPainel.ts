import { CASA } from '@compartilhado/constantes/casa'
import type { FatiaGasto, FiltroPainel, PainelDTO } from '@compartilhado/dtos/painel'
import { hojeISO, intervaloDoMes, ultimosMeses } from '@compartilhado/utilitarios/mes'
import type { TipoTransacao, Transacao } from '../../../dominio/entidades/Transacao'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { TransacaoMapeador } from '../../mapeadores/TransacaoMapeador'

const MESES_NO_HISTORICO = 6
const DIAS_PARA_CONFIRMAR = 7

const mesDe = (t: Transacao) => t.data.toISOString().slice(0, 7)
const dataDe = (t: Transacao) => t.data.toISOString().slice(0, 10)

function somar(transacoes: Transacao[], tipo: TipoTransacao, somentePrevistas = false): number {
  return transacoes
    .filter((t) => t.tipo === tipo && (!somentePrevistas || t.status === 'prevista'))
    .reduce((total, t) => total + t.valorCentavos, 0)
}

// Agrupa as despesas por uma chave (categoria, pessoa...) e ordena do maior para o menor.
function agruparDespesas(
  transacoes: Transacao[],
  chave: (t: Transacao) => string,
  descrever: (id: string) => { nome: string; cor: string }
): FatiaGasto[] {
  const totais = new Map<string, number>()
  for (const t of transacoes) {
    if (t.tipo !== 'despesa') continue
    totais.set(chave(t), (totais.get(chave(t)) ?? 0) + t.valorCentavos)
  }
  return [...totais]
    .map(([id, total]) => ({ id, total, ...descrever(id) }))
    .sort((a, b) => b.total - a.total)
}

// Resumo do mês para o painel. Os totais incluem lançamentos previstos (contas recorrentes
// ainda não confirmadas); os campos *Previstas mostram quanto disso ainda é estimativa.
export class ObterPainel {
  constructor(
    private readonly transacaoRepositorio: ITransacaoRepositorio,
    private readonly pessoaRepositorio: IPessoaRepositorio,
    private readonly categoriaRepositorio: ICategoriaRepositorio
  ) {}

  async executar({ pessoaId, mes }: FiltroPainel): Promise<PainelDTO> {
    const meses = ultimosMeses(mes, MESES_NO_HISTORICO)

    const [transacoes, pessoas, categorias] = await Promise.all([
      this.transacaoRepositorio.listar({
        pessoaId: pessoaId ?? undefined,
        inicio: intervaloDoMes(meses[0]).inicio,
        fim: intervaloDoMes(mes).fim
      }),
      this.pessoaRepositorio.listar(),
      this.categoriaRepositorio.listar()
    ])

    const porMes = new Map(meses.map((m) => [m, [] as Transacao[]]))
    for (const t of transacoes) porMes.get(mesDe(t))?.push(t)

    const fluxoMensal = meses.map((m) => {
      const doMes = porMes.get(m)!
      const receitas = somar(doMes, 'receita')
      const despesas = somar(doMes, 'despesa')
      const guardado = somar(doMes, 'guardado')
      return {
        mes: m,
        receitas,
        despesas,
        guardado,
        saldo: receitas - despesas - guardado,
        receitasPrevistas: somar(doMes, 'receita', true),
        despesasPrevistas: somar(doMes, 'despesa', true)
      }
    })

    const atual = fluxoMensal[fluxoMensal.length - 1]
    const anterior = fluxoMensal[fluxoMensal.length - 2]
    const doMes = porMes.get(mes)!

    // Extrai nome/cor explicitamente: as entidades expõem getters, que o spread (...) não copia.
    const categoriaPorId = new Map(categorias.map((c) => [c.id, { nome: c.nome, cor: c.cor }]))
    const pessoaPorId = new Map(pessoas.map((p) => [p.id, { nome: p.nome, cor: p.cor }]))
    const desconhecido = { nome: 'Desconhecido', cor: '#94a3b8' }

    const limiteConfirmacao = new Date(Date.now() + DIAS_PARA_CONFIRMAR * 86_400_000)
      .toISOString()
      .slice(0, 10)

    return {
      ...atual,
      taxaPoupanca: atual.receitas > 0 ? (atual.receitas - atual.despesas) / atual.receitas : null,
      variacaoDespesas:
        anterior.despesas > 0 ? (atual.despesas - anterior.despesas) / anterior.despesas : null,
      fluxoMensal,
      despesasPorCategoria: agruparDespesas(
        doMes,
        (t) => t.categoriaId,
        (id) => categoriaPorId.get(id) ?? desconhecido
      ),
      despesasPorPessoa: agruparDespesas(
        doMes,
        (t) => t.pessoaId ?? CASA.id,
        (id) => (id === CASA.id ? CASA : (pessoaPorId.get(id) ?? desconhecido))
      ),
      ultimasTransacoes: doMes
        .filter((t) => t.status === 'confirmada' && dataDe(t) <= hojeISO())
        .slice(0, 6)
        .map(TransacaoMapeador.paraDTO),
      aConfirmar: doMes
        .filter((t) => t.status === 'prevista' && dataDe(t) <= limiteConfirmacao)
        .sort((a, b) => a.data.getTime() - b.data.getTime())
        .map(TransacaoMapeador.paraDTO)
    }
  }
}
