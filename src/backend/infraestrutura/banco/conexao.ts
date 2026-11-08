import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import type { CofreSistema } from '../seguranca/CofreSistema'
import { executarMigracoes } from './migracoes'

// SQLite embutido no Node/Electron: não precisa de módulo nativo nem rebuild.
export type BancoDeDados = DatabaseSync

// Formato do arquivo cifrado: MAGICO | iv (12) | tag (16) | AES-256-GCM(deflate(banco serializado)).
const MAGICO = Buffer.from('PFCIFRA1')
const CABECALHO_SQLITE = Buffer.from('SQLite format 3\0')
const TAMANHO_CHAVE = 32
const TAMANHO_MINIMO_CIFRADO = MAGICO.length + 12 + 16 + 1

export class ErroArmazenamento extends Error {
  constructor(mensagem: string, opcoes?: ErrorOptions) {
    super(mensagem, opcoes)
    this.name = 'ErroArmazenamento'
  }
}

// Banco em memória que só toca o disco cifrado. A chave de 256 bits é aleatória, gerada no
// primeiro uso e guardada no arquivo `.chave` protegida pelo cofre do sistema operacional.
export class ArmazenamentoCifrado {
  readonly banco: BancoDeDados
  readonly cifrado = true
  private readonly chave: Buffer
  private alteracoesSalvas = -1
  private copiaFeita = false
  private migracaoLegadaPendente = false
  private ultimoEstadoPersistido = Buffer.alloc(0)
  private filaOperacoes: Promise<void> = Promise.resolve()

  constructor(
    private readonly caminho: string,
    cofre: CofreSistema
  ) {
    if (!cofre.disponivel()) {
      throw new ErroArmazenamento(
        'A proteção criptográfica do sistema operacional não está disponível. Por segurança, o aplicativo não abriu nem alterou os dados. Entre novamente no sistema ou verifique o cofre de credenciais e tente de novo.'
      )
    }

    this.chave = this.obterChave(cofre)
    this.recuperarGravacaoInterrompida()
    this.removerSidecarsLegadosSeCifrado()
    this.banco = this.abrirEmMemoria()
    this.banco.exec('PRAGMA foreign_keys = ON')
    executarMigracoes(this.banco)
    this.persistir(true) // DDL das migrações não conta em total_changes().
  }

  // Serializa operações que podem atravessar awaits. Se a regra de negócio ou o disco falhar,
  // restaura exatamente o último estado que já havia sido confirmado no arquivo cifrado.
  executarAtomico<T>(executar: () => Promise<T>): Promise<T> {
    const tarefa = this.filaOperacoes.then(async () => {
      try {
        const resultado = await executar()
        this.persistir()
        return resultado
      } catch (erro) {
        try {
          this.restaurarUltimoEstadoPersistido()
        } catch (erroRestauracao) {
          throw new ErroArmazenamento(
            'Não foi possível restaurar o estado seguro dos dados após uma falha. Feche o aplicativo e abra-o novamente.',
            { cause: erroRestauracao }
          )
        }
        throw erro
      }
    })
    this.filaOperacoes = tarefa.then(
      () => undefined,
      () => undefined
    )
    return tarefa
  }

  persistirQuandoDisponivel(forcar = false): Promise<void> {
    const tarefa = this.filaOperacoes.then(() => this.persistir(forcar))
    this.filaOperacoes = tarefa.then(
      () => undefined,
      () => undefined
    )
    return tarefa
  }

  fecharQuandoDisponivel(): Promise<void> {
    const tarefa = this.filaOperacoes.then(() => this.fechar())
    this.filaOperacoes = tarefa.then(
      () => undefined,
      () => undefined
    )
    return tarefa
  }

  // Grava se houve alteração desde a última gravação (ou sempre, com `forcar`).
  persistir(forcar = false): void {
    if (!this.banco.isOpen) return
    const alteracoes = this.totalAlteracoes()
    if (!forcar && alteracoes === this.alteracoesSalvas) return

    const estado = Buffer.from(this.banco.serialize())
    const arquivoCifrado = this.cifrar(estado)
    const temporario = `${this.caminho}.gravando`

    try {
      writeFileSync(temporario, arquivoCifrado, { flush: true })
      // Lê de volta o que chegou ao disco e autentica antes de publicar o arquivo.
      const conferido = this.decifrar(readFileSync(temporario))
      this.validarBanco(conferido)

      // Uma cópia da versão anterior por sessão, para recuperação sem sobrescrever o original legado.
      if (!this.copiaFeita && existsSync(this.caminho)) {
        this.copiarAtomico(this.caminho, `${this.caminho}.anterior`)
        this.copiaFeita = true
      }

      renameSync(temporario, this.caminho)
      this.sincronizarDiretorio()
    } catch (erro) {
      throw new ErroArmazenamento(
        'Não foi possível gravar os dados com segurança. A alteração não foi confirmada; verifique o espaço e as permissões do disco.',
        { cause: erro }
      )
    }

    this.alteracoesSalvas = alteracoes
    this.ultimoEstadoPersistido = estado
    if (this.migracaoLegadaPendente) {
      // Os sidecars originais só deixam de ser necessários depois que o arquivo cifrado foi publicado.
      this.removerSidecarsLegadosSeCifrado()
      this.migracaoLegadaPendente = false
    }
  }

  fechar(): void {
    if (!this.banco.isOpen) return
    this.persistir()
    this.banco.close()
  }

  private obterChave(cofre: CofreSistema): Buffer {
    const arquivoChave = `${this.caminho}.chave`
    const chaveTemporaria = `${arquivoChave}.gravando`

    if (existsSync(arquivoChave)) return this.lerChave(cofre, arquivoChave)

    if (existsSync(chaveTemporaria)) {
      const chave = this.lerChave(cofre, chaveTemporaria)
      renameSync(chaveTemporaria, arquivoChave)
      this.sincronizarDiretorio()
      return chave
    }

    if (this.existeArtefatoCifrado()) {
      throw new ErroArmazenamento(
        'O arquivo da chave de criptografia sumiu; sem ele os dados existentes não podem ser abertos. Restaure a pasta de dados completa a partir de um backup.'
      )
    }

    const nova = randomBytes(TAMANHO_CHAVE)
    try {
      writeFileSync(chaveTemporaria, cofre.cifrar(nova.toString('base64')), { flush: true, mode: 0o600 })
      // Confirma que o próprio cofre consegue recuperar a chave antes de adotá-la.
      const conferida = this.lerChave(cofre, chaveTemporaria)
      renameSync(chaveTemporaria, arquivoChave)
      this.sincronizarDiretorio()
      return conferida
    } catch (erro) {
      throw new ErroArmazenamento(
        'Não foi possível criar e proteger a chave de criptografia. Nenhum banco de dados foi criado.',
        { cause: erro }
      )
    }
  }

  private lerChave(cofre: CofreSistema, arquivo: string): Buffer {
    const texto = cofre.decifrar(readFileSync(arquivo, 'utf8'))
    if (!texto || !/^[A-Za-z0-9+/]{43}=$/.test(texto)) {
      throw new ErroArmazenamento(
        'A chave de criptografia dos dados não pôde ser aberta. Ela pode estar corrompida ou pertencer a outro usuário ou computador.'
      )
    }
    const chave = Buffer.from(texto, 'base64')
    if (chave.length !== TAMANHO_CHAVE || chave.toString('base64') !== texto) {
      throw new ErroArmazenamento('O arquivo da chave de criptografia é inválido.')
    }
    return chave
  }

  private abrirEmMemoria(): BancoDeDados {
    const banco = new DatabaseSync(':memory:')
    if (!existsSync(this.caminho)) return banco

    const cabecalho = this.lerCabecalho(this.caminho)
    if (cabecalho.equals(MAGICO)) {
      const conteudo = this.decifrar(readFileSync(this.caminho))
      this.validarBanco(conteudo)
      banco.deserialize(conteudo)
    } else if (readFileSync(this.caminho).subarray(0, CABECALHO_SQLITE.length).equals(CABECALHO_SQLITE)) {
      banco.deserialize(this.importarSemCriptografia())
    } else {
      banco.close()
      throw new ErroArmazenamento('O arquivo de dados não é reconhecido; ele não foi alterado.')
    }
    return banco
  }

  private cifrar(conteudo: Uint8Array): Buffer {
    const iv = randomBytes(12)
    const cifra = createCipheriv('aes-256-gcm', this.chave, iv)
    cifra.setAAD(MAGICO)
    const dados = Buffer.concat([cifra.update(deflateRawSync(conteudo)), cifra.final()])
    return Buffer.concat([MAGICO, iv, cifra.getAuthTag(), dados])
  }

  private decifrar(arquivo: Buffer): Buffer {
    if (arquivo.length < TAMANHO_MINIMO_CIFRADO || !arquivo.subarray(0, MAGICO.length).equals(MAGICO)) {
      throw new ErroArmazenamento('O arquivo cifrado está incompleto ou não é reconhecido.')
    }
    const iv = arquivo.subarray(8, 20)
    const tag = arquivo.subarray(20, 36)
    try {
      const decifra = createDecipheriv('aes-256-gcm', this.chave, iv)
      decifra.setAAD(MAGICO)
      decifra.setAuthTag(tag)
      return inflateRawSync(Buffer.concat([decifra.update(arquivo.subarray(36)), decifra.final()]))
    } catch (erro) {
      throw new ErroArmazenamento(
        'Os dados estão corrompidos ou foram alterados fora do aplicativo (falha na verificação de integridade).',
        { cause: erro }
      )
    }
  }

  // Banco de versões antigas: trabalha numa cópia e preserva o original até a troca atômica.
  private importarSemCriptografia(): Uint8Array {
    const trabalho = `${this.caminho}.migrando`
    this.removerBancoTemporario(trabalho)
    copyFileSync(this.caminho, trabalho)
    if (existsSync(`${this.caminho}-wal`)) copyFileSync(`${this.caminho}-wal`, `${trabalho}-wal`)

    let antigo: DatabaseSync | null = null
    try {
      antigo = new DatabaseSync(trabalho)
      antigo.exec('PRAGMA wal_checkpoint(TRUNCATE)')
      antigo.exec('PRAGMA journal_mode = DELETE')
      const bytes = antigo.serialize()
      this.validarBanco(bytes)
      this.copiaFeita = true
      this.migracaoLegadaPendente = true
      console.info('[banco] banco legado preparado para migração cifrada atômica.')
      return bytes
    } catch (erro) {
      throw new ErroArmazenamento(
        'Não foi possível migrar o banco antigo. O arquivo original não foi alterado.',
        { cause: erro }
      )
    } finally {
      if (antigo?.isOpen) antigo.close()
      this.removerBancoTemporario(trabalho)
    }
  }

  private recuperarGravacaoInterrompida(): void {
    const temporario = `${this.caminho}.gravando`
    if (!existsSync(temporario)) return

    try {
      const recuperado = this.decifrar(readFileSync(temporario))
      this.validarBanco(recuperado)
    } catch (erro) {
      if (!existsSync(this.caminho)) {
        throw new ErroArmazenamento(
          'Foi encontrada uma gravação interrompida, mas ela está corrompida e não existe uma versão anterior dos dados.',
          { cause: erro }
        )
      }
      return // A versão principal continua segura; o temporário será substituído na próxima gravação.
    }

    const principalInexistente = !existsSync(this.caminho)
    const temporarioMaisNovo =
      principalInexistente || statSync(temporario).mtimeMs >= statSync(this.caminho).mtimeMs
    if (!temporarioMaisNovo) return

    if (!principalInexistente) this.copiarAtomico(this.caminho, `${this.caminho}.anterior`)
    renameSync(temporario, this.caminho)
    this.copiaFeita = !principalInexistente
    this.sincronizarDiretorio()
    console.info('[banco] gravação cifrada interrompida recuperada com integridade.')
  }

  private restaurarUltimoEstadoPersistido(): void {
    if (!this.banco.isOpen || this.ultimoEstadoPersistido.length === 0) return
    this.banco.deserialize(this.ultimoEstadoPersistido)
    this.banco.exec('PRAGMA foreign_keys = ON')
    this.alteracoesSalvas = this.totalAlteracoes()
    try {
      rmSync(`${this.caminho}.gravando`, { force: true })
    } catch {
      // O temporário pode ser justamente o alvo que falhou (permissão, diretório ou volume indisponível).
    }
  }

  private validarBanco(conteudo: Uint8Array): void {
    const teste = new DatabaseSync(':memory:')
    try {
      teste.deserialize(conteudo)
      const resultado = teste.prepare('PRAGMA quick_check').get() as { quick_check: string } | undefined
      if (resultado?.quick_check !== 'ok') throw new Error('SQLite quick_check falhou')
    } finally {
      teste.close()
    }
  }

  private totalAlteracoes(): number {
    return (this.banco.prepare('SELECT total_changes() AS n').get() as { n: number }).n
  }

  private existeArtefatoCifrado(): boolean {
    try {
      return [this.caminho, `${this.caminho}.gravando`, `${this.caminho}.anterior`].some(
        (arquivo) => existsSync(arquivo) && this.lerCabecalho(arquivo).equals(MAGICO)
      )
    } catch (erro) {
      throw new ErroArmazenamento('Não foi possível verificar os arquivos de recuperação dos dados.', { cause: erro })
    }
  }

  private lerCabecalho(arquivo: string): Buffer {
    return readFileSync(arquivo).subarray(0, MAGICO.length)
  }

  private copiarAtomico(origem: string, destino: string): void {
    const temporario = `${destino}.gravando`
    writeFileSync(temporario, readFileSync(origem), { flush: true, mode: 0o600 })
    renameSync(temporario, destino)
    this.sincronizarDiretorio()
  }

  private removerBancoTemporario(base: string): void {
    for (const sufixo of ['', '-wal', '-shm']) rmSync(`${base}${sufixo}`, { force: true })
  }

  private removerSidecarsLegadosSeCifrado(): void {
    if (!existsSync(this.caminho) || !this.lerCabecalho(this.caminho).equals(MAGICO)) return
    try {
      for (const sufixo of ['-wal', '-shm']) rmSync(`${this.caminho}${sufixo}`, { force: true })
    } catch (erro) {
      throw new ErroArmazenamento(
        'O banco foi cifrado, mas não foi possível remover arquivos temporários legados. Verifique as permissões da pasta de dados.',
        { cause: erro }
      )
    }
  }

  private sincronizarDiretorio(): void {
    // Em sistemas POSIX, confirma também a entrada criada pelo rename. No Windows, o diretório pode
    // não aceitar fsync; o arquivo em si já foi aberto com flush e essa etapa é apenas adicional.
    let descritor: number | null = null
    try {
      descritor = openSync(dirname(this.caminho), 'r')
      fsyncSync(descritor)
    } catch {
      // Sem fallback inseguro: a gravação principal já foi sincronizada antes do rename atômico.
    } finally {
      if (descritor !== null) closeSync(descritor)
    }
  }
}
