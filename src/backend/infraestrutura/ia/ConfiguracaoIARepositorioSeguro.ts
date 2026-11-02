import { ErroDominio } from '../../dominio/erros/ErroDominio'
import {
  MODELO_PADRAO,
  type ConfiguracaoIA,
  type IConfiguracaoIARepositorio
} from '../../dominio/repositorios/IConfiguracaoIARepositorio'
import type { ConfiguracoesSqlite } from '../banco/Configuracoes'
import type { CofreSistema } from '../seguranca/CofreSistema'

const CHAVES = {
  chave: 'ia.chave_cifrada',
  modelo: 'ia.modelo',
  usarNosTextos: 'ia.usar_nos_textos'
}

// A chave da API é cifrada pelo cofre do sistema operacional; no banco fica só o texto cifrado.
export class ConfiguracaoIARepositorioSeguro implements IConfiguracaoIARepositorio {
  constructor(
    private readonly configuracoes: ConfiguracoesSqlite,
    private readonly cofre: CofreSistema
  ) {}

  criptografiaDisponivel(): boolean {
    return this.cofre.disponivel()
  }

  async obter(): Promise<ConfiguracaoIA> {
    const cifrada = this.configuracoes.ler(CHAVES.chave)
    return {
      chave: cifrada ? this.cofre.decifrar(cifrada) : null, // cifrada em outro usuário/máquina: pede de novo
      modelo: this.configuracoes.ler(CHAVES.modelo) ?? MODELO_PADRAO,
      usarNosTextos: this.configuracoes.ler(CHAVES.usarNosTextos) !== 'nao'
    }
  }

  async salvar({ chave, modelo, usarNosTextos }: { chave?: string | null; modelo: string; usarNosTextos: boolean }) {
    if (chave !== undefined && chave !== null) {
      if (!this.cofre.disponivel()) {
        throw new ErroDominio('A criptografia do sistema não está disponível; a chave não pode ser guardada com segurança.')
      }
      this.configuracoes.gravar(CHAVES.chave, this.cofre.cifrar(chave.trim()))
    }
    if (chave === null) this.configuracoes.remover(CHAVES.chave)
    this.configuracoes.gravar(CHAVES.modelo, modelo.trim() || MODELO_PADRAO)
    this.configuracoes.gravar(CHAVES.usarNosTextos, usarNosTextos ? 'sim' : 'nao')
  }
}
