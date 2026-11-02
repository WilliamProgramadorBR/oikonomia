import type {
  ConfiguracaoIADTO,
  MensagemChatDTO,
  RespostaAssistenteDTO,
  SalvarConfiguracaoIAEntrada,
  TesteIADTO
} from '@compartilhado/dtos/ia'
import type {
  ArquivoEntrada,
  ConfirmarContrachequeEntrada,
  ContrachequeLidoDTO,
  NotaFiscalLidaDTO,
  ResultadoContrachequeDTO
} from '@compartilhado/dtos/importacao'
import { api, desembrulhar } from './api'

export const iaServico = {
  obterConfiguracao(): Promise<ConfiguracaoIADTO> {
    return desembrulhar(api.ia.obterConfiguracao())
  },
  salvarConfiguracao(entrada: SalvarConfiguracaoIAEntrada): Promise<ConfiguracaoIADTO> {
    return desembrulhar(api.ia.salvarConfiguracao(entrada))
  },
  testar(): Promise<TesteIADTO> {
    return desembrulhar(api.ia.testar())
  },
  conversar(mensagens: MensagemChatDTO[]): Promise<RespostaAssistenteDTO> {
    return desembrulhar(api.ia.conversar(mensagens))
  }
}

export const importacaoServico = {
  lerContracheque(arquivo: ArquivoEntrada): Promise<ContrachequeLidoDTO> {
    return desembrulhar(api.importacao.lerContracheque(arquivo))
  },
  confirmarContracheque(entrada: ConfirmarContrachequeEntrada): Promise<ResultadoContrachequeDTO> {
    return desembrulhar(api.importacao.confirmarContracheque(entrada))
  },
  lerNotaFiscal(endereco: string): Promise<NotaFiscalLidaDTO> {
    return desembrulhar(api.importacao.lerNotaFiscal(endereco))
  }
}

// Lê um arquivo local como base64 (sem o prefixo "data:...;base64,").
export function lerArquivo(arquivo: File): Promise<ArquivoEntrada> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onload = () => resolver({ nome: arquivo.name, mime: arquivo.type, base64: String(leitor.result).split(',')[1] ?? '' })
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}
