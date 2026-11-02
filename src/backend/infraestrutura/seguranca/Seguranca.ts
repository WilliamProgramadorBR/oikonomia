import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import type { IGeradorSegredos, IGuardaSessao, IHashSenha } from '../../dominio/portas/ISeguranca'
import type { ConfiguracoesSqlite } from '../banco/Configuracoes'
import type { CofreSistema } from './CofreSistema'

const derivar = (senha: string, sal: Buffer, tamanho: number, opcoes: ScryptOptions) =>
  new Promise<Buffer>((resolver, rejeitar) =>
    scrypt(senha.normalize('NFKC'), sal, tamanho, opcoes, (erro, chave) => (erro ? rejeitar(erro) : resolver(chave)))
  )

// scrypt (memória + CPU caros contra força bruta), sal aleatório por senha.
// Formato: scrypt$N$r$p$sal$hash (base64). Os parâmetros viajam no hash para poderem subir no futuro.
export class HashSenhaScrypt implements IHashSenha {
  private static readonly N = 2 ** 15
  private static readonly R = 8
  private static readonly P = 1
  private static readonly TAMANHO = 64

  async gerar(senha: string): Promise<string> {
    const { N, R, P, TAMANHO } = HashSenhaScrypt
    const sal = randomBytes(16)
    const hash = await derivar(senha, sal, TAMANHO, { N, r: R, p: P, maxmem: 128 * N * R * 2 })
    return ['scrypt', N, R, P, sal.toString('base64'), hash.toString('base64')].join('$')
  }

  async verificar(senha: string, armazenado: string): Promise<boolean> {
    const [algoritmo, n, r, p, salTexto, hashTexto] = armazenado.split('$')
    if (algoritmo !== 'scrypt' || !salTexto || !hashTexto) return false
    const N = Number(n)
    const R = Number(r)
    const esperado = Buffer.from(hashTexto, 'base64')
    try {
      const obtido = await derivar(senha, Buffer.from(salTexto, 'base64'), esperado.length, {
        N,
        r: R,
        p: Number(p),
        maxmem: 128 * N * R * 2
      })
      return obtido.length === esperado.length && timingSafeEqual(obtido, esperado)
    } catch {
      return false
    }
  }
}

export class GeradorSegredosCripto implements IGeradorSegredos {
  token(): string {
    return randomBytes(32).toString('base64url')
  }

  codigoNumerico(digitos: number): string {
    return Array.from({ length: digitos }, () => randomInt(0, 10)).join('')
  }

  resumo(valor: string): string {
    return createHash('sha256').update(valor).digest('hex')
  }

  iguais(a: string, b: string): boolean {
    const x = Buffer.from(a)
    const y = Buffer.from(b)
    return x.length === y.length && timingSafeEqual(x, y)
  }
}

const CHAVE_SESSAO = 'autenticacao.sessao_cifrada'

// "Manter conectado": o token fica cifrado pelo cofre do sistema operacional,
// então copiar os dados para outra máquina ou usuário não reabre a sessão.
export class GuardaSessaoSegura implements IGuardaSessao {
  constructor(
    private readonly configuracoes: ConfiguracoesSqlite,
    private readonly cofre: CofreSistema
  ) {}

  disponivel(): boolean {
    return this.cofre.disponivel()
  }

  guardar(token: string): void {
    if (this.disponivel()) this.configuracoes.gravar(CHAVE_SESSAO, this.cofre.cifrar(token))
  }

  ler(): string | null {
    const cifrado = this.configuracoes.ler(CHAVE_SESSAO)
    return cifrado ? this.cofre.decifrar(cifrado) : null
  }

  limpar(): void {
    this.configuracoes.remover(CHAVE_SESSAO)
  }
}
