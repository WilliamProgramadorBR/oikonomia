import { safeStorage } from 'electron'

// Cofre do sistema operacional (DPAPI no Windows, Keychain no macOS, libsecret no Linux) via
// safeStorage do Electron. O que ele cifra só pode ser decifrado pelo mesmo usuário na mesma máquina.
export class CofreSistema {
  disponivel(): boolean {
    try {
      if (!safeStorage.isEncryptionAvailable()) return false
      // No Linux, `basic_text` usa uma senha fixa e não oferece proteção real.
      return process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'
    } catch {
      return false
    }
  }

  cifrar(texto: string): string {
    if (!this.disponivel()) throw new Error('Cofre do sistema indisponível.')
    return safeStorage.encryptString(texto).toString('base64')
  }

  // null quando foi cifrado em outro usuário/máquina ou o conteúdo está corrompido.
  decifrar(cifrado: string): string | null {
    if (!this.disponivel()) return null
    try {
      return safeStorage.decryptString(Buffer.from(cifrado, 'base64'))
    } catch {
      return null
    }
  }
}
