import type {
  AlterarSenhaEntrada,
  CadastrarUsuarioEntrada,
  EntrarEntrada,
  EstadoAutenticacaoDTO,
  MensagemDTO,
  RedefinirSenhaEntrada,
  UsuarioDTO
} from '@compartilhado/dtos/autenticacao'
import { api, desembrulhar } from './api'

export const autenticacaoServico = {
  estado(): Promise<EstadoAutenticacaoDTO> {
    return desembrulhar(api.autenticacao.estado())
  },
  cadastrar(entrada: CadastrarUsuarioEntrada): Promise<UsuarioDTO> {
    return desembrulhar(api.autenticacao.cadastrar(entrada))
  },
  entrar(entrada: EntrarEntrada): Promise<UsuarioDTO> {
    return desembrulhar(api.autenticacao.entrar(entrada))
  },
  sair(): Promise<void> {
    return desembrulhar(api.autenticacao.sair())
  },
  solicitarRecuperacao(email: string): Promise<MensagemDTO> {
    return desembrulhar(api.autenticacao.solicitarRecuperacao(email))
  },
  redefinirSenha(entrada: RedefinirSenhaEntrada): Promise<MensagemDTO> {
    return desembrulhar(api.autenticacao.redefinirSenha(entrada))
  },
  alterarSenha(entrada: AlterarSenhaEntrada): Promise<MensagemDTO> {
    return desembrulhar(api.autenticacao.alterarSenha(entrada))
  },
  listarUsuarios(): Promise<UsuarioDTO[]> {
    return desembrulhar(api.autenticacao.listarUsuarios())
  }
}
