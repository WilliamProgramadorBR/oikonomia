// Nomes dos canais IPC. Front e back importam daqui para nunca divergirem.
export const CANAIS = {
  sistema: {
    situacao: 'sistema:situacao'
  },
  autenticacao: {
    estado: 'autenticacao:estado',
    cadastrar: 'autenticacao:cadastrar',
    entrar: 'autenticacao:entrar',
    sair: 'autenticacao:sair',
    solicitarRecuperacao: 'autenticacao:solicitar-recuperacao',
    redefinirSenha: 'autenticacao:redefinir-senha',
    alterarSenha: 'autenticacao:alterar-senha',
    listarUsuarios: 'autenticacao:listar-usuarios'
  },
  pessoas: {
    listar: 'pessoas:listar',
    criar: 'pessoas:criar',
    atualizar: 'pessoas:atualizar',
    remover: 'pessoas:remover'
  },
  categorias: {
    listar: 'categorias:listar',
    criar: 'categorias:criar',
    remover: 'categorias:remover'
  },
  transacoes: {
    listar: 'transacoes:listar',
    criar: 'transacoes:criar',
    confirmar: 'transacoes:confirmar',
    remover: 'transacoes:remover'
  },
  recorrencias: {
    listar: 'recorrencias:listar',
    criar: 'recorrencias:criar',
    encerrar: 'recorrencias:encerrar'
  },
  painel: {
    obter: 'painel:obter'
  },
  previsao: {
    obter: 'previsao:obter'
  },
  saude: {
    obter: 'saude:obter'
  },
  analise: {
    obter: 'analise:obter'
  },
  objetivos: {
    listar: 'objetivos:listar',
    criar: 'objetivos:criar',
    atualizar: 'objetivos:atualizar',
    remover: 'objetivos:remover',
    aportar: 'objetivos:aportar',
    programarAporte: 'objetivos:programar-aporte'
  },
  dividas: {
    plano: 'dividas:plano',
    criar: 'dividas:criar',
    remover: 'dividas:remover',
    simularCredito: 'dividas:simular-credito'
  },
  ia: {
    obterConfiguracao: 'ia:obter-configuracao',
    salvarConfiguracao: 'ia:salvar-configuracao',
    testar: 'ia:testar',
    conversar: 'ia:conversar'
  },
  importacao: {
    lerContracheque: 'importacao:ler-contracheque',
    confirmarContracheque: 'importacao:confirmar-contracheque',
    lerNotaFiscal: 'importacao:ler-nota-fiscal'
  },
  perfil: {
    obter: 'perfil:obter',
    salvar: 'perfil:salvar'
  },
  cartoes: {
    listar: 'cartoes:listar',
    criar: 'cartoes:criar',
    remover: 'cartoes:remover',
    resumo: 'cartoes:resumo',
    criarCompra: 'cartoes:criar-compra',
    removerCompra: 'cartoes:remover-compra'
  },
  taxas: {
    listar: 'taxas:listar',
    atualizar: 'taxas:atualizar'
  }
} as const
