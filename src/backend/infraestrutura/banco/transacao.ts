import type { DatabaseSync } from 'node:sqlite'

// Executa a função dentro de uma transação, desfazendo tudo se lançar erro.
export function emTransacao<T>(banco: DatabaseSync, executar: () => T): T {
  banco.exec('BEGIN')
  try {
    const resultado = executar()
    banco.exec('COMMIT')
    return resultado
  } catch (erro) {
    banco.exec('ROLLBACK')
    throw erro
  }
}
