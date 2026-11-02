import { safeStorage } from 'electron'

// Cofre do sistema operacional (DPAPI no Windows, Keychain no macOS, libsecret no Linux) via
// safeStorage do Electron. O que ele cifra só pode ser decifrado pelo mesmo usuário na mesma máquina.
export class CofreSistema {
  disponivel(): boolean {
    return safeStorage.isEncryptionAvailable()
  }

  cifrar(texto: string): string {
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
