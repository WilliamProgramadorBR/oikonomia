// inativo: app em desenvolvimento (atualização automática só existe no app instalado)
export type FaseAtualizacao =
  | 'inativo'
  | 'verificando'
  | 'atualizado'
  | 'baixando'
  | 'pronta' // baixada: instala ao fechar ou ao clicar em "Reiniciar agora"
  | 'erro'

export interface EstadoAtualizacaoDTO {
  fase: FaseAtualizacao
  versaoAtual: string
  versaoNova: string | null
  progresso: number | null // 0 a 100, durante o download
  mensagem: string | null
}
