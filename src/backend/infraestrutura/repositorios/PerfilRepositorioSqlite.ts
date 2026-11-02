import type {
  EstiloPerfil,
  PerfilFinanceiro,
  PrioridadePerfil
} from '../../dominio/entidades/PerfilFinanceiro'
import type { IPerfilRepositorio } from '../../dominio/repositorios/IPerfilRepositorio'
import { ConfiguracoesSqlite } from '../banco/Configuracoes'
import type { BancoDeDados } from '../banco/conexao'
import { emTransacao } from '../banco/transacao'

const CHAVES = {
  estilo: 'perfil.estilo',
  prioridade: 'perfil.prioridade',
  rendimento: 'perfil.rendimento_mensal'
}

// O perfil é da família toda: fica na tabela chave/valor de configurações.
export class PerfilRepositorioSqlite implements IPerfilRepositorio {
  private readonly configuracoes: ConfiguracoesSqlite

  constructor(private readonly banco: BancoDeDados) {
    this.configuracoes = new ConfiguracoesSqlite(banco)
  }

  async obter(): Promise<PerfilFinanceiro | null> {
    const ler = (chave: string) => this.configuracoes.ler(chave)
    const estilo = ler(CHAVES.estilo)
    if (!estilo) return null
    return {
      estilo: estilo as EstiloPerfil,
      prioridade: (ler(CHAVES.prioridade) ?? 'equilibrio') as PrioridadePerfil,
      rendimentoMensal: Number(ler(CHAVES.rendimento) ?? 0.9)
    }
  }

  async salvar(perfil: PerfilFinanceiro): Promise<void> {
    emTransacao(this.banco, () => {
      this.configuracoes.gravar(CHAVES.estilo, perfil.estilo)
      this.configuracoes.gravar(CHAVES.prioridade, perfil.prioridade)
      this.configuracoes.gravar(CHAVES.rendimento, String(perfil.rendimentoMensal))
    })
  }
}
