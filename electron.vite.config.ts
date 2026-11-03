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
        input: { index: resolve('src/preload/index.ts') }
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        // A página da conexão do Open Finance é servida ao navegador do sistema pelo servidor local temporário.
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
