export interface SituacaoSistemaDTO {
  versao: string
  dadosCifrados: boolean // banco gravado em disco com AES-256-GCM
}
