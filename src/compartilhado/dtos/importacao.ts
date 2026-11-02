export interface ArquivoEntrada {
  nome: string
  mime: string // application/pdf, image/jpeg, image/png...
  base64: string
}

export interface ContrachequeLidoDTO {
  lidoPorIA: boolean
  aviso: string | null
  empresa: string | null
  competencia: string | null // AAAA-MM
  salarioBrutoCentavos: number | null
  descontos: { descricao: string; valorCentavos: number }[]
  liquidoCentavos: number | null
  dataPagamento: string | null // AAAA-MM-DD
}

export interface ConfirmarContrachequeEntrada {
  pessoaId: string
  competencia: string
  liquidoCentavos: number
  dataPagamento: string
  descricao: string
}

export interface ResultadoContrachequeDTO {
  acao: 'confirmou_previsto' | 'criou_receita'
  mensagem: string
}

export interface ItemNotaDTO {
  descricao: string
  quantidade: number
  valorCentavos: number
}

export interface NotaFiscalLidaDTO {
  origem: 'sefaz' | 'ia' | 'chave' // como os dados foram obtidos
  aviso: string | null
  url: string
  emitente: string | null
  cnpj: string | null
  data: string | null // AAAA-MM-DD
  totalCentavos: number | null
  itens: ItemNotaDTO[]
  categoriaSugeridaId: string | null
}
