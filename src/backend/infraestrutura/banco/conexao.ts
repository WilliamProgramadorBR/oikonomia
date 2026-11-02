import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import type { CofreSistema } from '../seguranca/CofreSistema'
import { executarMigracoes } from './migracoes'

// SQLite embutido no Node/Electron: não precisa de módulo nativo nem rebuild.
export type BancoDeDados = DatabaseSync

// Formato do arquivo cifrado: MAGICO | iv (12) | tag (16) | AES-256-GCM(deflate(banco serializado)).
const MAGICO = Buffer.from('PFCIFRA1')
const CABECALHO_SQLITE = Buffer.from('SQLite format 3\0')

export class ErroArmazenamento extends Error {}

// Banco em memória que só toca o disco cifrado. A chave de 256 bits é aleatória, gerada no
// primeiro uso e guardada no arquivo `.chave` protegida pelo cofre do sistema operacional:
// copiar os arquivos para outro computador ou usuário não revela nada.
export class ArmazenamentoCifrado {
  readonly banco: BancoDeDados
  readonly cifrado: boolean
  private readonly chave: Buffer | null
  private alteracoesSalvas = -1
  private copiaFeita = false

  constructor(
    private readonly caminho: string,
    cofre: CofreSistema
  ) {
    const chave = cofre.disponivel() ? this.obterChave(cofre) : null
    this.cifrado = chave !== null
    this.chave = chave
    if (!chave) console.warn('[banco] cofre do sistema indisponível: os dados ficarão sem criptografia.')

    this.banco = chave ? this.abrirEmMemoria(chave) : new DatabaseSync(caminho)
    if (!chave) this.banco.exec('PRAGMA journal_mode = WAL')
    this.banco.exec('PRAGMA foreign_keys = ON')
    executarMigracoes(this.banco)
    this.persistir(true) // DDL das migrações não conta em total_changes()
  }

  // Grava se houve alteração desde a última gravação (ou sempre, com `forcar`).
  persistir(forcar = false): void {
    if (!this.chave || !this.banco.isOpen) return
    const alteracoes = (this.banco.prepare('SELECT total_changes() AS n').get() as { n: number }).n
    if (!forcar && alteracoes === this.alteracoesSalvas) return

    const iv = randomBytes(12)
    const cifra = createCipheriv('aes-256-gcm', this.chave, iv)
    cifra.setAAD(MAGICO)
    const conteudo = Buffer.concat([cifra.update(deflateRawSync(this.banco.serialize())), cifra.final()])

    // Uma cópia da versão anterior por sessão, para o caso de algo dar errado ao gravar.
    if (!this.copiaFeita && existsSync(this.caminho)) {
      copyFileSync(this.caminho, `${this.caminho}.anterior`)
      this.copiaFeita = true
    }
    // Gravação atômica: escreve ao lado e troca de uma vez (nunca deixa o arquivo pela metade).
    const temporario = `${this.caminho}.gravando`
    writeFileSync(temporario, Buffer.concat([MAGICO, iv, cifra.getAuthTag(), conteudo]), { flush: true })
    renameSync(temporario, this.caminho)
    this.alteracoesSalvas = alteracoes
  }

  fechar(): void {
    if (!this.banco.isOpen) return
    this.persistir()
    this.banco.close()
  }

  private obterChave(cofre: CofreSistema): Buffer {
    const arquivoChave = `${this.caminho}.chave`
    if (existsSync(arquivoChave)) {
      const chave = cofre.decifrar(readFileSync(arquivoChave, 'utf8'))
      if (!chave) {
        throw new ErroArmazenamento(
          'A chave de criptografia dos dados não pôde ser aberta. Os dados foram protegidos por outro usuário do Windows ou outro computador.'
        )
      }
      return Buffer.from(chave, 'base64')
    }
    if (existsSync(this.caminho) && this.lerCabecalho().equals(MAGICO)) {
      throw new ErroArmazenamento('O arquivo da chave de criptografia sumiu; sem ele os dados não podem ser abertos.')
    }
    const nova = randomBytes(32)
    writeFileSync(arquivoChave, cofre.cifrar(nova.toString('base64')), { flush: true })
    return nova
  }

  private abrirEmMemoria(chave: Buffer): BancoDeDados {
    const banco = new DatabaseSync(':memory:')
    if (!existsSync(this.caminho)) return banco

    const cabecalho = this.lerCabecalho()
    if (cabecalho.equals(MAGICO)) {
      banco.deserialize(this.decifrarArquivo(chave))
    } else if (readFileSync(this.caminho).subarray(0, 16).equals(CABECALHO_SQLITE)) {
      banco.deserialize(this.importarSemCriptografia())
    } else {
      throw new ErroArmazenamento('O arquivo de dados não é reconhecido.')
    }
    return banco
  }

  private decifrarArquivo(chave: Buffer): Uint8Array {
    const arquivo = readFileSync(this.caminho)
    const iv = arquivo.subarray(8, 20)
    const tag = arquivo.subarray(20, 36)
    try {
      const decifra = createDecipheriv('aes-256-gcm', chave, iv)
      decifra.setAAD(MAGICO)
      decifra.setAuthTag(tag)
      return inflateRawSync(Buffer.concat([decifra.update(arquivo.subarray(36)), decifra.final()]))
    } catch {
      throw new ErroArmazenamento('Os dados estão corrompidos ou foram alterados fora do app (falha na verificação de integridade).')
    }
  }

  // Banco de versões antigas (sem criptografia): traz para a memória. A primeira gravação
  // substitui o arquivo aberto pelo cifrado, de forma atômica.
  private importarSemCriptografia(): Uint8Array {
    const antigo = new DatabaseSync(this.caminho)
    antigo.exec('PRAGMA wal_checkpoint(TRUNCATE)')
    antigo.exec('PRAGMA journal_mode = DELETE')
    const bytes = antigo.serialize()
    antigo.close()
    for (const sufixo of ['-wal', '-shm']) rmSync(`${this.caminho}${sufixo}`, { force: true })
    this.copiaFeita = true // a cópia "anterior" nunca pode ser a versão aberta
    console.info('[banco] dados existentes migrados para o formato cifrado.')
    return bytes
  }

  private lerCabecalho(): Buffer {
    return readFileSync(this.caminho).subarray(0, MAGICO.length)
  }
}
