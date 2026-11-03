import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ApiFinanceiro } from '@compartilhado/contratos/api'
import { CANAIS } from '@compartilhado/contratos/canais'

// Ponte segura: o renderer só enxerga estas funções, nunca o ipcRenderer diretamente.
const api: ApiFinanceiro = {
  sistema: {
    situacao: () => ipcRenderer.invoke(CANAIS.sistema.situacao)
  },
  atualizacao: {
    obter: () => ipcRenderer.invoke(CANAIS.atualizacao.obter),
    verificar: () => ipcRenderer.invoke(CANAIS.atualizacao.verificar),
    instalar: () => ipcRenderer.invoke(CANAIS.atualizacao.instalar),
    aoMudar: (ouvinte) => {
      const tratar = (_evento: IpcRendererEvent, estado: Parameters<typeof ouvinte>[0]) => ouvinte(estado)
      ipcRenderer.on(CANAIS.atualizacao.mudou, tratar)
      return () => ipcRenderer.removeListener(CANAIS.atualizacao.mudou, tratar)
    }
  },
  autenticacao: {
    estado: () => ipcRenderer.invoke(CANAIS.autenticacao.estado),
    cadastrar: (entrada) => ipcRenderer.invoke(CANAIS.autenticacao.cadastrar, entrada),
    entrar: (entrada) => ipcRenderer.invoke(CANAIS.autenticacao.entrar, entrada),
    sair: () => ipcRenderer.invoke(CANAIS.autenticacao.sair),
    solicitarRecuperacao: (email) => ipcRenderer.invoke(CANAIS.autenticacao.solicitarRecuperacao, email),
    redefinirSenha: (entrada) => ipcRenderer.invoke(CANAIS.autenticacao.redefinirSenha, entrada),
    alterarSenha: (entrada) => ipcRenderer.invoke(CANAIS.autenticacao.alterarSenha, entrada),
    listarUsuarios: () => ipcRenderer.invoke(CANAIS.autenticacao.listarUsuarios)
  },
  pessoas: {
    listar: () => ipcRenderer.invoke(CANAIS.pessoas.listar),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.pessoas.criar, entrada),
    atualizar: (entrada) => ipcRenderer.invoke(CANAIS.pessoas.atualizar, entrada),
    remover: (id) => ipcRenderer.invoke(CANAIS.pessoas.remover, id)
  },
  categorias: {
    listar: () => ipcRenderer.invoke(CANAIS.categorias.listar),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.categorias.criar, entrada),
    remover: (id) => ipcRenderer.invoke(CANAIS.categorias.remover, id)
  },
  transacoes: {
    listar: (filtro) => ipcRenderer.invoke(CANAIS.transacoes.listar, filtro),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.transacoes.criar, entrada),
    confirmar: (entrada) => ipcRenderer.invoke(CANAIS.transacoes.confirmar, entrada),
    remover: (id) => ipcRenderer.invoke(CANAIS.transacoes.remover, id)
  },
  recorrencias: {
    listar: () => ipcRenderer.invoke(CANAIS.recorrencias.listar),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.recorrencias.criar, entrada),
    encerrar: (entrada) => ipcRenderer.invoke(CANAIS.recorrencias.encerrar, entrada)
  },
  painel: {
    obter: (filtro) => ipcRenderer.invoke(CANAIS.painel.obter, filtro)
  },
  previsao: {
    obter: (filtro) => ipcRenderer.invoke(CANAIS.previsao.obter, filtro)
  },
  saude: {
    obter: (pessoaId) => ipcRenderer.invoke(CANAIS.saude.obter, pessoaId)
  },
  analise: {
    obter: (filtro) => ipcRenderer.invoke(CANAIS.analise.obter, filtro)
  },
  objetivos: {
    listar: () => ipcRenderer.invoke(CANAIS.objetivos.listar),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.objetivos.criar, entrada),
    atualizar: (entrada) => ipcRenderer.invoke(CANAIS.objetivos.atualizar, entrada),
    remover: (id) => ipcRenderer.invoke(CANAIS.objetivos.remover, id),
    aportar: (entrada) => ipcRenderer.invoke(CANAIS.objetivos.aportar, entrada),
    programarAporte: (entrada) => ipcRenderer.invoke(CANAIS.objetivos.programarAporte, entrada)
  },
  dividas: {
    plano: (extraMensal) => ipcRenderer.invoke(CANAIS.dividas.plano, extraMensal),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.dividas.criar, entrada),
    remover: (id) => ipcRenderer.invoke(CANAIS.dividas.remover, id),
    simularCredito: (entrada) => ipcRenderer.invoke(CANAIS.dividas.simularCredito, entrada)
  },
  ia: {
    obterConfiguracao: () => ipcRenderer.invoke(CANAIS.ia.obterConfiguracao),
    salvarConfiguracao: (entrada) => ipcRenderer.invoke(CANAIS.ia.salvarConfiguracao, entrada),
    testar: () => ipcRenderer.invoke(CANAIS.ia.testar),
    conversar: (mensagens) => ipcRenderer.invoke(CANAIS.ia.conversar, mensagens),
    interpretarLancamentos: (texto) => ipcRenderer.invoke(CANAIS.ia.interpretarLancamentos, texto),
    confirmarLancamentos: (propostas) => ipcRenderer.invoke(CANAIS.ia.confirmarLancamentos, propostas)
  },
  contas: {
    listar: () => ipcRenderer.invoke(CANAIS.contas.listar),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.contas.criar, entrada),
    conferir: (entrada) => ipcRenderer.invoke(CANAIS.contas.conferir, entrada),
    arquivar: (id) => ipcRenderer.invoke(CANAIS.contas.arquivar, id),
    lerExtrato: (entrada) => ipcRenderer.invoke(CANAIS.contas.lerExtrato, entrada),
    importarExtrato: (entrada) => ipcRenderer.invoke(CANAIS.contas.importarExtrato, entrada)
  },
  ajustes: {
    ajustarPrevista: (entrada) => ipcRenderer.invoke(CANAIS.ajustes.ajustarPrevista, entrada),
    simularFerias: (entrada) => ipcRenderer.invoke(CANAIS.ajustes.simularFerias, entrada),
    aplicarFerias: (entrada) => ipcRenderer.invoke(CANAIS.ajustes.aplicarFerias, entrada)
  },
  importacao: {
    lerContracheque: (arquivo) => ipcRenderer.invoke(CANAIS.importacao.lerContracheque, arquivo),
    confirmarContracheque: (entrada) => ipcRenderer.invoke(CANAIS.importacao.confirmarContracheque, entrada),
    lerNotaFiscal: (endereco) => ipcRenderer.invoke(CANAIS.importacao.lerNotaFiscal, endereco)
  },
  perfil: {
    obter: () => ipcRenderer.invoke(CANAIS.perfil.obter),
    salvar: (entrada) => ipcRenderer.invoke(CANAIS.perfil.salvar, entrada)
  },
  cartoes: {
    listar: () => ipcRenderer.invoke(CANAIS.cartoes.listar),
    criar: (entrada) => ipcRenderer.invoke(CANAIS.cartoes.criar, entrada),
    remover: (id) => ipcRenderer.invoke(CANAIS.cartoes.remover, id),
    resumo: (filtro) => ipcRenderer.invoke(CANAIS.cartoes.resumo, filtro),
    criarCompra: (entrada) => ipcRenderer.invoke(CANAIS.cartoes.criarCompra, entrada),
    removerCompra: (id) => ipcRenderer.invoke(CANAIS.cartoes.removerCompra, id)
  },
  taxas: {
    listar: (modalidade) => ipcRenderer.invoke(CANAIS.taxas.listar, modalidade),
    atualizar: () => ipcRenderer.invoke(CANAIS.taxas.atualizar)
  }
}

contextBridge.exposeInMainWorld('api', api)
