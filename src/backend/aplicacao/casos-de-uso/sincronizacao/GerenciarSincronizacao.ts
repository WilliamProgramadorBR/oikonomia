import { randomUUID } from 'node:crypto'
import type {
  AlterarFraseSincronizacaoEntrada,
  AtivarSincronizacaoEntrada,
  DesativarSincronizacaoEntrada,
  DesbloquearSincronizacaoEntrada,
  EstadoSincronizacaoDTO
} from '../../../../compartilhado/dtos/sincronizacao'
import { ErroDominio } from '../../../dominio/erros/ErroDominio'
import type { ICriptografiaSincronizacao } from '../../../dominio/portas/ICriptografiaSincronizacao'
import type { ISincronizacaoRepositorio } from '../../../dominio/repositorios/ISincronizacaoRepositorio'

const TAMANHO_MINIMO_FRASE = 16
const TAMANHO_MAXIMO_FRASE = 256

export class GerenciarSincronizacao {
  private chaveDados: Uint8Array | null = null

  constructor(
    private readonly repositorio: ISincronizacaoRepositorio,
    private readonly criptografia: ICriptografiaSincronizacao
  ) {}

  async estado(): Promise<EstadoSincronizacaoDTO> {
    const estado = await this.repositorio.obterEstado()
    return {
      modo: estado.modo,
      fase: estado.fase,
      bloqueado: estado.modo === 'sincronizacao' && this.chaveDados === null,
      dispositivoId: estado.dispositivoId,
      familiaId: estado.familiaId,
      ultimoCursor: estado.ultimoCursor,
      mensagem: estado.mensagem
    }
  }

  async ativar(entrada: AtivarSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    const atual = await this.repositorio.obterEstado()
    if (atual.modo !== 'local') throw new ErroDominio('A sincronização já foi preparada neste dispositivo.')
    this.validarNovaFrase(entrada.fraseSecreta, entrada.confirmacao)

    const criado = await this.criptografia.criar(entrada.fraseSecreta)
    try {
      await this.repositorio.prepararCofre({
        dispositivoId: randomUUID(),
        cofreChave: criado.envelope,
        atualizadoEm: new Date()
      })
      this.substituirChave(criado.chaveDados)
    } catch (erro) {
      this.criptografia.limpar(criado.chaveDados)
      throw erro
    }
    return this.estado()
  }

  async desbloquear({ fraseSecreta }: DesbloquearSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    const estado = await this.estadoComCofre()
    try {
      this.substituirChave(await this.criptografia.abrir(fraseSecreta, estado.cofreChave))
    } catch {
      throw new ErroDominio('Frase secreta incorreta ou cofre de sincronização danificado.')
    }
    return this.estado()
  }

  async bloquear(): Promise<EstadoSincronizacaoDTO> {
    if (this.chaveDados) this.criptografia.limpar(this.chaveDados)
    this.chaveDados = null
    return this.estado()
  }

  async alterarFrase(entrada: AlterarFraseSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    this.validarNovaFrase(entrada.fraseNova, entrada.confirmacao)
    const estado = await this.estadoComCofre()
    let chave: Uint8Array
    try {
      chave = await this.criptografia.abrir(entrada.fraseAtual, estado.cofreChave)
    } catch {
      throw new ErroDominio('A frase secreta atual está incorreta.')
    }

    try {
      const envelope = await this.criptografia.reproteger(chave, entrada.fraseNova)
      await this.repositorio.atualizarCofre(envelope, new Date())
      this.substituirChave(chave)
    } catch (erro) {
      this.criptografia.limpar(chave)
      throw erro
    }
    return this.estado()
  }

  async desativar({ fraseSecreta }: DesativarSincronizacaoEntrada): Promise<EstadoSincronizacaoDTO> {
    const estado = await this.estadoComCofre()
    let conferida: Uint8Array
    try {
      conferida = await this.criptografia.abrir(fraseSecreta, estado.cofreChave)
    } catch {
      throw new ErroDominio('A frase secreta está incorreta; o modo local não foi ativado.')
    }
    this.criptografia.limpar(conferida)
    await this.repositorio.voltarParaLocal(new Date())
    if (this.chaveDados) this.criptografia.limpar(this.chaveDados)
    this.chaveDados = null
    return this.estado()
  }

  chaveDesbloqueada(): Uint8Array {
    if (!this.chaveDados) throw new ErroDominio('Informe a frase secreta para desbloquear a sincronização.')
    return this.chaveDados
  }

  private async estadoComCofre() {
    const estado = await this.repositorio.obterEstado()
    if (estado.modo !== 'sincronizacao' || !estado.cofreChave) {
      throw new ErroDominio('A sincronização segura ainda não foi preparada.')
    }
    return { ...estado, cofreChave: estado.cofreChave }
  }

  private validarNovaFrase(frase: string, confirmacao: string): void {
    const tamanho = Array.from(frase.normalize('NFKC')).length
    if (tamanho < TAMANHO_MINIMO_FRASE) {
      throw new ErroDominio(`Use uma frase secreta com pelo menos ${TAMANHO_MINIMO_FRASE} caracteres.`)
    }
    if (tamanho > TAMANHO_MAXIMO_FRASE) throw new ErroDominio('A frase secreta é longa demais.')
    if (frase !== confirmacao) throw new ErroDominio('A confirmação da frase secreta não confere.')
  }

  private substituirChave(nova: Uint8Array): void {
    if (this.chaveDados && this.chaveDados !== nova) this.criptografia.limpar(this.chaveDados)
    this.chaveDados = nova
  }
}
