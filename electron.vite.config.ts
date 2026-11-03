import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const aliases = {
  '@backend': resolve('src/backend'),
  '@compartilhado': resolve('src/compartilhado')
}

export default defineConfig({
  main: {
    resolve: { alias: aliases }
  },
  preload: {
    resolve: { alias: aliases },
    build: {
      rollupOptions: {
        // Cada janela tem a sua ponte: a da Pluggy só devolve o resultado da conexão.
        input: { index: resolve('src/preload/index.ts'), conexaoBancaria: resolve('src/preload/conexaoBancaria.ts') }
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html'), conexaoBancaria: resolve('src/renderer/conexao-bancaria.html') }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@compartilhado': resolve('src/compartilhado')
      }
    }
  }
})
