import { ERRO_NAO_AUTENTICADO, type Resposta } from '../../../compartilhado/contratos/resposta'
import { ErroDominio } from '../../dominio/erros/ErroDominio'
import { ErroArmazenamento } from '../../infraestrutura/banco/conexao'

interface SessaoIpc {
  readonly autenticado: boolean
}

interface UnidadeTrabalhoIpc {
  executarAtomico<T>(executar: () => Promise<T>): Promise<T>
}

function nomeSeguro(erro: unknown): string {
  return erro instanceof Error ? erro.name : 'erro não identificado'
}

// Só produz uma resposta de sucesso depois que a unidade de trabalho confirmou a gravação.
// A própria unidade restaura o último estado persistido diante de qualquer exceção.
export async function executarHandlerIpc<A extends unknown[], T>(
  sessao: SessaoIpc,
  armazenamento: UnidadeTrabalhoIpc,
  canal: string,
  executar: (...args: A) => Promise<T>,
  args: A,
  publico: boolean
): Promise<Resposta<T>> {
  if (!publico && !sessao.autenticado) {
    return { sucesso: false, erro: ERRO_NAO_AUTENTICADO }
  }

  try {
    const dados = await armazenamento.executarAtomico(() => executar(...args))
    return { sucesso: true, dados }
  } catch (erro) {
    if (erro instanceof ErroDominio) return { sucesso: false, erro: erro.message }
    if (erro instanceof ErroArmazenamento) {
      console.error(`[IPC ${canal}] falha de armazenamento (${nomeSeguro(erro)})`)
      return {
        sucesso: false,
        erro: 'Não foi possível salvar os dados com segurança. A alteração não foi mantida. Verifique o espaço e as permissões do disco e tente novamente.'
      }
    }
    // Não registra argumentos, payloads nem mensagens de provedores externos, pois podem conter dados sensíveis.
    console.error(`[IPC ${canal}] falha inesperada (${nomeSeguro(erro)})`)
    return { sucesso: false, erro: 'Erro inesperado. Tente novamente.' }
  }
}
