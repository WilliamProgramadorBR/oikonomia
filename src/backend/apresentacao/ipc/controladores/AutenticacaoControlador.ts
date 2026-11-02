import type {
  AlterarSenhaEntrada,
  CadastrarUsuarioEntrada,
  EntrarEntrada,
  EstadoAutenticacaoDTO,
  MensagemDTO,
  RedefinirSenhaEntrada,
  UsuarioDTO
} from '@compartilhado/dtos/autenticacao'
import type {
  AlterarSenha,
  CadastrarUsuario,
  Entrar,
  ListarUsuarios,
  ObterEstadoAutenticacao,
  RedefinirSenha,
  Sair,
  SolicitarRecuperacaoSenha
} from '../../../aplicacao/casos-de-uso/autenticacao/Autenticacao'

export class AutenticacaoControlador {
  constructor(
    private readonly obterEstado: ObterEstadoAutenticacao,
    private readonly cadastrarUsuario: CadastrarUsuario,
    private readonly entrarUC: Entrar,
    private readonly sairUC: Sair,
    private readonly solicitarRecuperacaoUC: SolicitarRecuperacaoSenha,
    private readonly redefinirSenhaUC: RedefinirSenha,
    private readonly alterarSenhaUC: AlterarSenha,
    private readonly listarUsuariosUC: ListarUsuarios
  ) {}

  estado(): Promise<EstadoAutenticacaoDTO> {
    return this.obterEstado.executar()
  }

  cadastrar(entrada: CadastrarUsuarioEntrada): Promise<UsuarioDTO> {
    return this.cadastrarUsuario.executar(entrada)
  }

  entrar(entrada: EntrarEntrada): Promise<UsuarioDTO> {
    return this.entrarUC.executar(entrada)
  }

  sair(): Promise<void> {
    return this.sairUC.executar()
  }

  solicitarRecuperacao(email: string): Promise<MensagemDTO> {
    return this.solicitarRecuperacaoUC.executar(email)
  }

  redefinirSenha(entrada: RedefinirSenhaEntrada): Promise<MensagemDTO> {
    return this.redefinirSenhaUC.executar(entrada)
  }

  alterarSenha(entrada: AlterarSenhaEntrada): Promise<MensagemDTO> {
    return this.alterarSenhaUC.executar(entrada)
  }

  listarUsuarios(): Promise<UsuarioDTO[]> {
    return this.listarUsuariosUC.executar()
  }
}
