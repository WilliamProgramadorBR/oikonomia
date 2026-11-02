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
    resolve: { alias: aliases }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@compartilhado': resolve('src/compartilhado')
      }
    }
  }
})
