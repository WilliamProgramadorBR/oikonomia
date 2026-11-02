import type {
  LoteTaxasMercado,
  ModalidadeCredito,
  TaxaMercado
} from '../../dominio/entidades/TaxaMercado'
import type { IProvedorTaxasMercado } from '../../dominio/portas/IProvedorTaxasMercado'

// API pública do Banco Central (Olinda), serviço "taxaJuros".
// Só baixa dados públicos; nenhum dado do usuário é enviado.
const BASE = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata'
const ENDERECO_DIARIO = `${BASE}/TaxasJurosDiariaPorInicioPeriodo`
// Financiamento imobiliário só é publicado na série mensal
const ENDERECO_MENSAL = `${BASE}/TaxasJurosMensalPorMes`

const MODALIDADES_IMOBILIARIO: Record<string, ModalidadeCredito> = {
  'Financiamento imobiliário com taxas de mercado - Prefixado': 'imobiliario_prefixado',
  'Financiamento imobiliário com taxas de mercado - Pós-fixado referenciado em TR': 'imobiliario_tr'
}

interface RegistroMensal {
  Modalidade: string
  Posicao: number
  InstituicaoFinanceira: string
  TaxaJurosAoMes: number
  TaxaJurosAoAno: number
  cnpj8: string
  anoMes: string
}

const TEMPO_LIMITE_MS = 30_000

// Nome da modalidade no Banco Central -> nossa modalidade
const MODALIDADES: Record<string, ModalidadeCredito> = {
  'Cartão de crédito - parcelado - Prefixado': 'cartao_parcelado',
  'Cartão de crédito - rotativo total - Prefixado': 'cartao_rotativo',
  'Cheque especial - Prefixado': 'cheque_especial',
  'Crédito pessoal não consignado - Prefixado': 'credito_pessoal',
  'Crédito pessoal consignado privado - Prefixado': 'consignado_privado',
  'Crédito pessoal consignado público - Prefixado': 'consignado_publico',
  'Crédito pessoal consignado INSS - Prefixado': 'consignado_inss',
  'Aquisição de veículos - Prefixado': 'veiculos'
}

interface RegistroBancoCentral {
  InicioPeriodo: string
  FimPeriodo: string
  Segmento: string
  Modalidade: string
  Posicao: number
  InstituicaoFinanceira: string
  TaxaJurosAoMes: number
  TaxaJurosAoAno: number
  cnpj8: string
}

export class BancoCentralProvedorTaxas implements IProvedorTaxasMercado {
  async buscarMaisRecentes(): Promise<LoteTaxasMercado> {
    const filtroPessoaFisica = "Segmento eq 'PESSOA FÍSICA'"

    // 1) Descobre o período mais recente publicado
    const [ultimo] = await this.consultar<RegistroBancoCentral>(ENDERECO_DIARIO, {
      $filter: filtroPessoaFisica,
      $orderby: 'InicioPeriodo desc',
      $select: 'InicioPeriodo',
      $top: '1'
    })
    if (!ultimo) throw new Error('O Banco Central não retornou nenhum período de taxas.')

    // 2) Baixa todas as taxas de pessoa física daquele período
    const registros = await this.consultar<RegistroBancoCentral>(ENDERECO_DIARIO, {
      $filter: `${filtroPessoaFisica} and InicioPeriodo eq '${ultimo.InicioPeriodo}'`,
      $top: '10000'
    })

    const taxas: TaxaMercado[] = []
    for (const r of registros) {
      const modalidade = MODALIDADES[r.Modalidade]
      if (!modalidade) continue
      taxas.push({
        cnpj8: r.cnpj8,
        instituicao: r.InstituicaoFinanceira.trim(),
        modalidade,
        taxaMensal: r.TaxaJurosAoMes,
        taxaAnual: r.TaxaJurosAoAno,
        posicao: r.Posicao
      })
    }

    taxas.push(...(await this.buscarImobiliario()))

    return {
      inicioPeriodo: registros[0]?.InicioPeriodo ?? ultimo.InicioPeriodo,
      fimPeriodo: registros[0]?.FimPeriodo ?? ultimo.InicioPeriodo,
      taxas
    }
  }

  // Série mensal: último mês publicado, só as modalidades imobiliárias que usamos.
  private async buscarImobiliario(): Promise<TaxaMercado[]> {
    const [ultimo] = await this.consultar<RegistroMensal>(ENDERECO_MENSAL, {
      $orderby: 'anoMes desc',
      $select: 'anoMes',
      $top: '1'
    })
    if (!ultimo) return []
    const registros = await this.consultar<RegistroMensal>(ENDERECO_MENSAL, {
      $filter: `anoMes eq '${ultimo.anoMes}'`,
      $top: '1000'
    })
    return registros
      .filter((r) => MODALIDADES_IMOBILIARIO[r.Modalidade])
      .map((r) => ({
        cnpj8: r.cnpj8,
        instituicao: r.InstituicaoFinanceira.trim(),
        modalidade: MODALIDADES_IMOBILIARIO[r.Modalidade],
        taxaMensal: r.TaxaJurosAoMes,
        taxaAnual: r.TaxaJurosAoAno,
        posicao: r.Posicao
      }))
  }

  private async consultar<T>(endereco: string, parametros: Record<string, string>): Promise<T[]> {
    const consulta = Object.entries({ ...parametros, $format: 'json' })
      .map(([chave, valor]) => `${chave}=${encodeURIComponent(valor)}`)
      .join('&')

    const resposta = await fetch(`${endereco}?${consulta}`, {
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
    })
    if (!resposta.ok) throw new Error(`Banco Central respondeu ${resposta.status}`)

    const corpo = (await resposta.json()) as { value: T[] }
    return corpo.value
  }
}
