// Porta para consultar uma NFC-e pelo endereço do QR code (portal da SEFAZ do estado).

export interface NotaFiscal {
  emitente: string | null
  cnpj: string | null
  data: string | null // AAAA-MM-DD
  totalCentavos: number | null
  itens: { descricao: string; quantidade: number; valorCentavos: number }[]
}

export interface PaginaNfce {
  nota: NotaFiscal | null // null = não deu para ler a página automaticamente
  texto: string // texto da página, para outras tentativas (ex.: IA)
}

export interface IConsultaNfce {
  consultar(url: string): Promise<PaginaNfce>
}
