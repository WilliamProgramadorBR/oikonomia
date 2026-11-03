import type {
  ConferirSaldoEntrada,
  ContaDTO,
  CriarContaEntrada,
  ImportarExtratoEntrada,
  LerExtratoEntrada,
  PreviaImportacaoDTO,
  ResultadoConferenciaDTO,
  ResultadoImportacaoDTO
} from '@compartilhado/dtos/conta'
import { hojeISO } from '@compartilhado/utilitarios/mes'
import { ContaBancaria } from '../../../dominio/entidades/ContaBancaria'
import { ErroDominio, ErroNaoEncontrado } from '../../../dominio/erros/ErroDominio'
import type { ICategoriaRepositorio } from '../../../dominio/repositorios/ICategoriaRepositorio'
import type { IContaRepositorio } from '../../../dominio/repositorios/IContaRepositorio'
import type { IPessoaRepositorio } from '../../../dominio/repositorios/IPessoaRepositorio'
import type { ITransacaoRepositorio } from '../../../dominio/repositorios/ITransacaoRepositorio'
import { decodificarArquivo, lerExtrato } from '../../../dominio/servicos/ExtratoBancario'
import { moeda } from '../../servicos/formatacao'
import { reconciliar } from '../../servicos/ReconciliacaoExtrato'
import type { SincronizarRecorrencias } from '../recorrencia/SincronizarRecorrencias'
import type { CriarTransacao } from '../transacao/CriarTransacao'

const DIA = 24 * 60 * 60 * 1000
const TAMANHO_MAXIMO = 5 * 1024 * 1024
const somarDias = (iso: string, dias: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + dias * DIA).toISOString().slice(0, 10)
const validarData = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new ErroDominio('Data inválida.')
}

// Saldo de uma conta numa data: último saldo conferido até ela + lançamentos confirmados depois.
async function saldoNaData(contas: IContaRepositorio, contaId: string, data: string) {
  const referencia = await contas.ultimoSaldo(contaId)
  const desde = referencia && referencia.data <= data ? referencia.data : '0000-00-00'
  const movimento = await contas.movimentoEntre(contaId, desde, data)
  const base = referencia && referencia.data <= data ? referencia.saldoCentavos : 0
  return { referencia, movimento, saldo: base + movimento.entradasCentavos - movimento.saidasCentavos }
}

export class ListarContas {
  constructor(private readonly contas: IContaRepositorio) {}

  async executar(): Promise<ContaDTO[]> {
    const hoje = hojeISO()
    const lista = await this.contas.listar()
    return Promise.all(
      lista.map(async (c) => {
        const { referencia, movimento, saldo } = await saldoNaData(this.contas, c.id, hoje)
        return {
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          instituicao: c.instituicao,
          cnpj8: c.cnpj8,
          pessoaId: c.pessoaId,
          ativa: c.ativa,
          saldoAtualCentavos: saldo,
          referencia: referencia ? { data: referencia.data, saldoCentavos: referencia.saldoCentavos, origem: referencia.origem } : null,
          movimentosDesdeReferencia: movimento.quantidade,
          diasDesdeConferencia: referencia
            ? Math.round((new Date(`${hoje}T00:00:00Z`).getTime() - new Date(`${referencia.data}T00:00:00Z`).getTime()) / DIA)
            : null
        }
      })
    )
  }
}

export class CriarConta {
  constructor(
    private readonly contas: IContaRepositorio,
    private readonly pessoas: IPessoaRepositorio
  ) {}

  async executar(e: CriarContaEntrada): Promise<void> {
    if (e.pessoaId && !(await this.pessoas.buscarPorId(e.pessoaId))) throw new ErroNaoEncontrado('Pessoa', e.pessoaId)
    if (!Number.isInteger(e.saldoCentavos)) throw new ErroDominio('Saldo inválido.')
    validarData(e.dataSaldo)
    const conta = ContaBancaria.criar({ nome: e.nome, tipo: e.tipo, instituicao: e.instituicao, cnpj8: e.cnpj8, pessoaId: e.pessoaId })
    await this.contas.salvar(conta)
    await this.contas.registrarSaldo({
      id: crypto.randomUUID(),
      contaId: conta.id,
      data: e.dataSaldo,
      saldoCentavos: e.saldoCentavos,
      origem: 'informado',
      criadoEm: new Date()
    })
  }
}

// O usuário olhou o app do banco e informou o saldo real: vira a nova referência.
export class ConferirSaldo {
  constructor(private readonly contas: IContaRepositorio) {}

  async executar(e: ConferirSaldoEntrada): Promise<ResultadoConferenciaDTO> {
    if (!(await this.contas.buscarPorId(e.contaId))) throw new ErroNaoEncontrado('Conta', e.contaId)
    if (!Number.isInteger(e.saldoCentavos)) throw new ErroDominio('Saldo inválido.')
    validarData(e.data)
    const { saldo } = await saldoNaData(this.contas, e.contaId, e.data)
    await this.contas.registrarSaldo({
      id: crypto.randomUUID(),
      contaId: e.contaId,
      data: e.data,
      saldoCentavos: e.saldoCentavos,
      origem: 'informado',
      criadoEm: new Date()
    })
    const diferenca = e.saldoCentavos - saldo
    return {
      diferencaCentavos: diferenca,
      mensagem:
        diferenca === 0
          ? 'Saldo conferido: o app estava certinho.'
          : `Saldo conferido. O app calculava ${moeda(saldo)}; a diferença de ${moeda(Math.abs(diferenca))} ${diferenca > 0 ? 'a mais' : 'a menos'} costuma ser algum lançamento sem conta ou esquecido. Importar o extrato ajuda a achar.`
    }
  }
}

export class ArquivarConta {
  constructor(private readonly contas: IContaRepositorio) {}

  async executar(id: string): Promise<void> {
    const conta = await this.contas.buscarPorId(id)
    if (!conta) throw new ErroNaoEncontrado('Conta', id)
    conta.arquivar()
    await this.contas.salvar(conta)
  }
}

export class LerExtrato {
  constructor(
    private readonly contas: IContaRepositorio,
    private readonly transacoes: ITransacaoRepositorio,
    private readonly categorias: ICategoriaRepositorio,
    private readonly pessoas: IPessoaRepositorio
  ) {}

  async executar({ contaId, arquivo }: LerExtratoEntrada): Promise<PreviaImportacaoDTO> {
    const conta = await this.contas.buscarPorId(contaId)
    if (!conta) throw new ErroNaoEncontrado('Conta', contaId)
    const bytes = Buffer.from(arquivo.base64, 'base64')
    if (bytes.length > TAMANHO_MAXIMO) throw new ErroDominio('Arquivo muito grande (máximo de 5 MB).')

    const extrato = lerExtrato(decodificarArquivo(bytes))
    const datas = extrato.linhas.map((l) => l.data).sort()
    const periodo = { inicio: datas[0], fim: datas[datas.length - 1] }
    const [candidatas, daConta, categorias, pessoas] = await Promise.all([
      this.transacoes.listar({ inicio: somarDias(periodo.inicio, -7), fim: somarDias(periodo.fim, 7) }),
      this.transacoes.listar({ contaId, incluirIgnoradas: true }),
      this.categorias.listar(),
      this.pessoas.listar()
    ])

    const linhas = reconciliar(extrato.linhas, {
      conta,
      candidatas: candidatas.filter((t) => !t.cartaoId),
      idsImportados: new Set(daConta.map((t) => t.idExtrato).filter((id): id is string => id !== null)),
      categorias,
      pessoas
    })
    return { contaId, formato: extrato.formato, periodo, linhas, saldoFinal: extrato.saldoFinal }
  }
}

export class ImportarExtrato {
  constructor(
    private readonly contas: IContaRepositorio,
    private readonly transacoes: ITransacaoRepositorio,
    private readonly criarTransacao: CriarTransacao,
    private readonly sincronizar: SincronizarRecorrencias
  ) {}

  async executar({ contaId, linhas, saldoFinal }: ImportarExtratoEntrada): Promise<ResultadoImportacaoDTO> {
    if (!(await this.contas.buscarPorId(contaId))) throw new ErroNaoEncontrado('Conta', contaId)
    let criados = 0
    let confirmados = 0
    let vinculados = 0

    for (const linha of linhas) {
      const valor = Math.abs(linha.valorCentavos)
      const existente = linha.transacaoId ? await this.transacoes.buscarPorId(linha.transacaoId) : null

      if (existente && linha.situacao === 'prevista' && existente.status === 'prevista') {
        existente.confirmar(valor, new Date(`${linha.data}T00:00:00Z`))
        existente.vincularConta(contaId, linha.idExtrato)
        await this.transacoes.salvar(existente)
        confirmados++
      } else if (existente && linha.situacao === 'ja_lancada') {
        existente.vincularConta(contaId, linha.idExtrato)
        await this.transacoes.salvar(existente)
        vinculados++
      } else {
        const criada = await this.criarTransacao.executar({
          descricao: linha.proposta.descricao,
          valorCentavos: valor,
          tipo: linha.proposta.tipo,
          data: linha.data,
          pessoaId: linha.proposta.pessoaId,
          categoriaId: linha.proposta.categoriaId,
          contaId
        })
        const transacao = (await this.transacoes.buscarPorId(criada.id))!
        transacao.vincularConta(contaId, linha.idExtrato)
        await this.transacoes.salvar(transacao)
        criados++
      }
    }
    if (confirmados > 0) await this.sincronizar.executar()

    // O saldo final do extrato vira a referência da conta (se for mais recente que a atual).
    const referencia = await this.contas.ultimoSaldo(contaId)
    if (saldoFinal && (!referencia || saldoFinal.data >= referencia.data)) {
      await this.contas.registrarSaldo({
        id: crypto.randomUUID(),
        contaId,
        data: saldoFinal.data,
        saldoCentavos: saldoFinal.valorCentavos,
        origem: 'extrato',
        criadoEm: new Date()
      })
    }
    const { saldo } = await saldoNaData(this.contas, contaId, hojeISO())

    const partes = [
      criados && `${criados} lançamento${criados === 1 ? '' : 's'} novo${criados === 1 ? '' : 's'}`,
      confirmados && `${confirmados} previsto${confirmados === 1 ? '' : 's'} confirmado${confirmados === 1 ? '' : 's'}`,
      vinculados && `${vinculados} já lançado${vinculados === 1 ? '' : 's'} ligado${vinculados === 1 ? '' : 's'} à conta`
    ].filter(Boolean)
    return {
      criados,
      confirmados,
      vinculados,
      saldoAtualCentavos: saldo,
      mensagem: `${partes.join(', ') || 'Nada novo'}. Saldo da conta: ${moeda(saldo)}.`
    }
  }
}
