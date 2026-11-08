const { spawnSync } = require('node:child_process')
const { readdirSync } = require('node:fs')
const { join } = require('node:path')

let electron
try {
  electron = require('electron')
} catch {
  console.error('O binário do Electron não está instalado. Execute a instalação das dependências com scripts habilitados.')
  process.exit(1)
}

const pastaTestes = join('.test-dist', 'tests')
const arquivos = readdirSync(pastaTestes)
  .filter((arquivo) => arquivo.endsWith('.test.js'))
  .map((arquivo) => join(pastaTestes, arquivo))

const resultado = spawnSync(electron, ['--test', ...arquivos], {
  cwd: process.cwd(),
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: 'inherit'
})

if (resultado.error) {
  console.error(resultado.error.message)
  process.exit(1)
}
process.exit(resultado.status ?? 1)
