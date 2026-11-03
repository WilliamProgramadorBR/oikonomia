import { ObterAnalise } from '../aplicacao/casos-de-uso/analise/ObterAnalise'
import {
  CriarDivida,
  ObterPlanoDividas,
  RemoverDivida,
  SimularCredito
} from '../aplicacao/casos-de-uso/divida/Dividas'
import { CriarCartao } from '../aplicacao/casos-de-uso/cartao/CriarCartao'
import { CriarCompraCartao } from '../aplicacao/casos-de-uso/cartao/CriarCompraCartao'
import { ListarCartoes } from '../aplicacao/casos-de-uso/cartao/ListarCartoes'
import { ObterResumoCartoes } from '../aplicacao/casos-de-uso/cartao/ObterResumoCartoes'
import { RemoverCartao } from '../aplicacao/casos-de-uso/cartao/RemoverCartao'
import { RemoverCompraCartao } from '../aplicacao/casos-de-uso/cartao/RemoverCompraCartao'
import { CriarCategoria } from '../aplicacao/casos-de-uso/categoria/CriarCategoria'
import { ListarCategorias } from '../aplicacao/casos-de-uso/categoria/ListarCategorias'
import { RemoverCategoria } from '../aplicacao/casos-de-uso/categoria/RemoverCategoria'
import { ListarObjetivos } from '../aplicacao/casos-de-uso/objetivo/ListarObjetivos'
import {
  AportarObjetivo,
  AtualizarObjetivo,
  CriarObjetivo,
  ProgramarAporte,
  RemoverObjetivo
} from '../aplicacao/casos-de-uso/objetivo/ManterObjetivos'
import { ObterPainel } from '../aplicacao/casos-de-uso/painel/ObterPainel'
import { ObterPerfil, SalvarPerfil } from '../aplicacao/casos-de-uso/perfil/Perfil'
import { ObterPrevisao } from '../aplicacao/casos-de-uso/previsao/ObterPrevisao'
import { ObterSaudeFinanceira } from '../aplicacao/casos-de-uso/saude/ObterSaudeFinanceira'
import { NarradorNativo } from '../aplicacao/servicos/NarradorNativo'
import { NarradorComIA } from '../aplicacao/servicos/NarradorComIA'
import { SessaoAtual } from '../aplicacao/servicos/SessaoAtual'
import {
  AlterarSenha,
  CadastrarUsuario,
  Entrar,
  ListarUsuarios,
  ObterEstadoAutenticacao,
  RedefinirSenha,
  Sair,
  SolicitarRecuperacaoSenha,
  type DependenciasAcesso
} from '../aplicacao/casos-de-uso/autenticacao/Autenticacao'
import { AutenticacaoControlador } from '../apresentacao/ipc/controladores/AutenticacaoControlador'
import { EnvioEmailPendente } from '../infraestrutura/email/EnvioEmailPendente'
import {
  CodigoRecuperacaoRepositorioSqlite,
  SessaoRepositorioSqlite,
  UsuarioRepositorioSqlite
} from '../infraestrutura/repositorios/AcessoRepositoriosSqlite'
import { GeradorSegredosCripto, GuardaSessaoSegura, HashSenhaScrypt } from '../infraestrutura/seguranca/Seguranca'
import { MontadorContexto } from '../aplicacao/servicos/ContextoFinanceiro'
import {
  ConversarComAssistente,
  ObterConfiguracaoIA,
  SalvarConfiguracaoIA,
  TestarIA
} from '../aplicacao/casos-de-uso/ia/Assistente'
import {
  ConfirmarContracheque,
  LerContracheque,
  LerNotaFiscal
} from '../aplicacao/casos-de-uso/importacao/Importacao'
import { IAControlador, ImportacaoControlador } from '../apresentacao/ipc/controladores/IAControlador'
import { AjustesControlador } from '../apresentacao/ipc/controladores/AjustesControlador'
import { ContaControlador } from '../apresentacao/ipc/controladores/ContaControlador'
import { ArquivarConta, ConferirSaldo, CriarConta, ImportarExtrato, LerExtrato, ListarContas } from '../aplicacao/casos-de-uso/conta/Contas'
import { ContaRepositorioSqlite } from '../infraestrutura/repositorios/ContaRepositorioSqlite'
import { AjustarPrevista, AplicarFerias, SimularFerias } from '../aplicacao/casos-de-uso/recorrencia/AjustesDeRenda'
import { ConfirmarLancamentos, InterpretarLancamentos } from '../aplicacao/casos-de-uso/ia/LancamentosPorTexto'
import { GeminiProvedor } from '../infraestrutura/ia/GeminiProvedor'
import { ConfiguracaoIARepositorioSeguro } from '../infraestrutura/ia/ConfiguracaoIARepositorioSeguro'
import { SefazNfceConsulta } from '../infraestrutura/externos/SefazNfceConsulta'
import { CriarRecorrencia } from '../aplicacao/casos-de-uso/recorrencia/CriarRecorrencia'
import { EncerrarRecorrencia } from '../aplicacao/casos-de-uso/recorrencia/EncerrarRecorrencia'
import { ListarRecorrencias } from '../aplicacao/casos-de-uso/recorrencia/ListarRecorrencias'
import { SincronizarRecorrencias } from '../aplicacao/casos-de-uso/recorrencia/SincronizarRecorrencias'
import { DefinirContaRecorrencia } from '../aplicacao/casos-de-uso/recorrencia/DefinirContaRecorrencia'
import { ConfirmarTransacao } from '../aplicacao/casos-de-uso/transacao/ConfirmarTransacao'
import { AtualizarPessoa } from '../aplicacao/casos-de-uso/pessoa/AtualizarPessoa'
import { CriarPessoa } from '../aplicacao/casos-de-uso/pessoa/CriarPessoa'
import { ListarPessoas } from '../aplicacao/casos-de-uso/pessoa/ListarPessoas'
import { RemoverPessoa } from '../aplicacao/casos-de-uso/pessoa/RemoverPessoa'
import { AtualizarTaxasMercado } from '../aplicacao/casos-de-uso/taxa/AtualizarTaxasMercado'
import { ListarTaxasMercado } from '../aplicacao/casos-de-uso/taxa/ListarTaxasMercado'
import { CriarTransacao } from '../aplicacao/casos-de-uso/transacao/CriarTransacao'
import { ListarTransacoes } from '../aplicacao/casos-de-uso/transacao/ListarTransacoes'
import { RemoverTransacao } from '../aplicacao/casos-de-uso/transacao/RemoverTransacao'
import { AnaliseControlador } from '../apresentacao/ipc/controladores/AnaliseControlador'
import { CartaoControlador } from '../apresentacao/ipc/controladores/CartaoControlador'
import { DividaControlador } from '../apresentacao/ipc/controladores/DividaControlador'
import { CategoriaControlador } from '../apresentacao/ipc/controladores/CategoriaControlador'
import { ObjetivoControlador, PerfilControlador } from '../apresentacao/ipc/controladores/ObjetivoControlador'
import { PainelControlador } from '../apresentacao/ipc/controladores/PainelControlador'
import { PessoaControlador } from '../apresentacao/ipc/controladores/PessoaControlador'
import { PrevisaoControlador } from '../apresentacao/ipc/controladores/PrevisaoControlador'
import { RecorrenciaControlador } from '../apresentacao/ipc/controladores/RecorrenciaControlador'
import { SaudeControlador } from '../apresentacao/ipc/controladores/SaudeControlador'
import { TaxaControlador } from '../apresentacao/ipc/controladores/TaxaControlador'
import { TransacaoControlador } from '../apresentacao/ipc/controladores/TransacaoControlador'
import type { SituacaoSistemaDTO } from '@compartilhado/dtos/sistema'
import { ArmazenamentoCifrado } from '../infraestrutura/banco/conexao'
import { ConfiguracoesSqlite } from '../infraestrutura/banco/Configuracoes'
import { CofreSistema } from '../infraestrutura/seguranca/CofreSistema'
import { BancoCentralProvedorTaxas } from '../infraestrutura/externos/BancoCentralProvedorTaxas'
import { CartaoRepositorioSqlite } from '../infraestrutura/repositorios/CartaoRepositorioSqlite'
import { CategoriaRepositorioSqlite } from '../infraestrutura/repositorios/CategoriaRepositorioSqlite'
import { CompraCartaoRepositorioSqlite } from '../infraestrutura/repositorios/CompraCartaoRepositorioSqlite'
import { DividaRepositorioSqlite } from '../infraestrutura/repositorios/DividaRepositorioSqlite'
import { ObjetivoRepositorioSqlite } from '../infraestrutura/repositorios/ObjetivoRepositorioSqlite'
import { PerfilRepositorioSqlite } from '../infraestrutura/repositorios/PerfilRepositorioSqlite'
import { PessoaRepositorioSqlite } from '../infraestrutura/repositorios/PessoaRepositorioSqlite'
import { RecorrenciaRepositorioSqlite } from '../infraestrutura/repositorios/RecorrenciaRepositorioSqlite'
import { TaxaMercadoRepositorioSqlite } from '../infraestrutura/repositorios/TaxaMercadoRepositorioSqlite'
import { TransacaoRepositorioSqlite } from '../infraestrutura/repositorios/TransacaoRepositorioSqlite'

// Raiz de composição: o ÚNICO lugar que conhece todas as implementações concretas.
export function criarContainer(caminhoBanco: string, { desenvolvimento = false, versao = '0.0.0' } = {}) {
  const cofre = new CofreSistema()
  const armazenamento = new ArmazenamentoCifrado(caminhoBanco, cofre)
  const banco = armazenamento.banco
  const configuracoes = new ConfiguracoesSqlite(banco)

  const pessoaRepositorio = new PessoaRepositorioSqlite(banco)
  const categoriaRepositorio = new CategoriaRepositorioSqlite(banco)
  const transacaoRepositorio = new TransacaoRepositorioSqlite(banco)
  const cartaoRepositorio = new CartaoRepositorioSqlite(banco)
  const compraRepositorio = new CompraCartaoRepositorioSqlite(banco, transacaoRepositorio)
  const taxaRepositorio = new TaxaMercadoRepositorioSqlite(banco)
  const recorrenciaRepositorio = new RecorrenciaRepositorioSqlite(banco)
  const objetivoRepositorio = new ObjetivoRepositorioSqlite(banco)
  const perfilRepositorio = new PerfilRepositorioSqlite(banco)
  const contaRepositorio = new ContaRepositorioSqlite(banco)
  const provedorTaxas = new BancoCentralProvedorTaxas()

  const sincronizarRecorrencias = new SincronizarRecorrencias(
    recorrenciaRepositorio,
    transacaoRepositorio,
    cartaoRepositorio
  )
  const listarRecorrencias = new ListarRecorrencias(recorrenciaRepositorio, transacaoRepositorio)

  const pessoaControlador = new PessoaControlador(
    new CriarPessoa(pessoaRepositorio),
    new ListarPessoas(pessoaRepositorio),
    new AtualizarPessoa(pessoaRepositorio),
    new RemoverPessoa(pessoaRepositorio, transacaoRepositorio, recorrenciaRepositorio)
  )

  const categoriaControlador = new CategoriaControlador(
    new CriarCategoria(categoriaRepositorio),
    new ListarCategorias(categoriaRepositorio),
    new RemoverCategoria(categoriaRepositorio, transacaoRepositorio, recorrenciaRepositorio)
  )

  const transacaoControlador = new TransacaoControlador(
    new CriarTransacao(transacaoRepositorio, pessoaRepositorio, categoriaRepositorio, contaRepositorio),
    new ListarTransacoes(transacaoRepositorio),
    new ConfirmarTransacao(transacaoRepositorio, sincronizarRecorrencias),
    new RemoverTransacao(transacaoRepositorio)
  )

  const criarRecorrencia = new CriarRecorrencia(
    recorrenciaRepositorio,
    pessoaRepositorio,
    categoriaRepositorio,
    cartaoRepositorio,
    sincronizarRecorrencias,
    listarRecorrencias,
    contaRepositorio
  )
  const encerrarRecorrencia = new EncerrarRecorrencia(recorrenciaRepositorio, transacaoRepositorio)
  const recorrenciaControlador = new RecorrenciaControlador(
    listarRecorrencias,
    criarRecorrencia,
    encerrarRecorrencia,
    sincronizarRecorrencias,
    new DefinirContaRecorrencia(recorrenciaRepositorio, contaRepositorio, sincronizarRecorrencias)
  )

  const obterPrevisao = new ObterPrevisao(transacaoRepositorio, recorrenciaRepositorio)
  const previsaoControlador = new PrevisaoControlador(obterPrevisao)

  const painelControlador = new PainelControlador(
    new ObterPainel(transacaoRepositorio, pessoaRepositorio, categoriaRepositorio)
  )

  const obterResumoCartoes = new ObterResumoCartoes(
    cartaoRepositorio,
    compraRepositorio,
    transacaoRepositorio,
    taxaRepositorio
  )
  const cartaoControlador = new CartaoControlador(
    new CriarCartao(cartaoRepositorio, pessoaRepositorio, taxaRepositorio),
    new ListarCartoes(cartaoRepositorio, taxaRepositorio),
    new RemoverCartao(cartaoRepositorio, compraRepositorio),
    obterResumoCartoes,
    new CriarCompraCartao(compraRepositorio, cartaoRepositorio, pessoaRepositorio, categoriaRepositorio),
    new RemoverCompraCartao(compraRepositorio)
  )

  // Narrador nativo hoje; a IA entra aqui depois, com o nativo como plano B.
  // IA (Gemini) com textos nativos como plano B.
  const configuracaoIA = new ConfiguracaoIARepositorioSeguro(configuracoes, cofre)
  const provedorIA = new GeminiProvedor(configuracaoIA)

  const obterSaude = new ObterSaudeFinanceira(
    transacaoRepositorio,
    categoriaRepositorio,
    pessoaRepositorio,
    obterPrevisao,
    obterResumoCartoes,
    perfilRepositorio,
    new NarradorComIA(provedorIA, configuracaoIA, new NarradorNativo())
  )
  const saudeControlador = new SaudeControlador(obterSaude)

  const taxaControlador = new TaxaControlador(
    new ListarTaxasMercado(taxaRepositorio),
    new AtualizarTaxasMercado(provedorTaxas, taxaRepositorio)
  )

  const obterAnalise = new ObterAnalise(transacaoRepositorio, pessoaRepositorio, categoriaRepositorio, recorrenciaRepositorio)
  const analiseControlador = new AnaliseControlador(obterAnalise)

  const listarObjetivos = new ListarObjetivos(
    objetivoRepositorio,
    transacaoRepositorio,
    recorrenciaRepositorio,
    categoriaRepositorio,
    compraRepositorio,
    perfilRepositorio,
    obterPrevisao
  )
  const objetivoControlador = new ObjetivoControlador(
    listarObjetivos,
    new CriarObjetivo(objetivoRepositorio),
    new AtualizarObjetivo(objetivoRepositorio),
    new RemoverObjetivo(objetivoRepositorio),
    new AportarObjetivo(objetivoRepositorio, transacaoRepositorio),
    new ProgramarAporte(objetivoRepositorio, recorrenciaRepositorio, criarRecorrencia, encerrarRecorrencia)
  )
  const dividaRepositorio = new DividaRepositorioSqlite(banco)
  const obterPlanoDividas = new ObterPlanoDividas(
    dividaRepositorio,
    recorrenciaRepositorio,
    transacaoRepositorio,
    compraRepositorio,
    cartaoRepositorio,
    taxaRepositorio,
    perfilRepositorio,
    obterPrevisao
  )
  const dividaControlador = new DividaControlador(
    obterPlanoDividas,
    new CriarDivida(dividaRepositorio, pessoaRepositorio, recorrenciaRepositorio, sincronizarRecorrencias),
    new RemoverDivida(dividaRepositorio, recorrenciaRepositorio, encerrarRecorrencia),
    new SimularCredito(taxaRepositorio, obterSaude)
  )

  const perfilControlador = new PerfilControlador(
    new ObterPerfil(perfilRepositorio),
    new SalvarPerfil(perfilRepositorio)
  )

  // Lançamentos por texto: "eu" é o membro da família ligado a quem está conectado.
  const interpretarLancamentos = new InterpretarLancamentos(
    provedorIA,
    categoriaRepositorio,
    pessoaRepositorio,
    cartaoRepositorio,
    async () => (sessao.usuarioId ? ((await acesso.usuarios.buscarPorId(sessao.usuarioId))?.pessoaId ?? null) : null)
  )
  const confirmarLancamentos = new ConfirmarLancamentos(
    new CriarTransacao(transacaoRepositorio, pessoaRepositorio, categoriaRepositorio),
    criarRecorrencia,
    new CriarCompraCartao(compraRepositorio, cartaoRepositorio, pessoaRepositorio, categoriaRepositorio)
  )
  const contaControlador = new ContaControlador(
    new ListarContas(contaRepositorio, transacaoRepositorio),
    new CriarConta(contaRepositorio, pessoaRepositorio),
    new ConferirSaldo(contaRepositorio),
    new ArquivarConta(contaRepositorio),
    new LerExtrato(contaRepositorio, transacaoRepositorio, categoriaRepositorio, pessoaRepositorio),
    new ImportarExtrato(
      contaRepositorio,
      transacaoRepositorio,
      new CriarTransacao(transacaoRepositorio, pessoaRepositorio, categoriaRepositorio, contaRepositorio),
      sincronizarRecorrencias
    )
  )
  const simularFerias = new SimularFerias(recorrenciaRepositorio, transacaoRepositorio)
  const ajustesControlador = new AjustesControlador(
    new AjustarPrevista(transacaoRepositorio),
    simularFerias,
    new AplicarFerias(simularFerias, recorrenciaRepositorio, transacaoRepositorio)
  )

  const obterConfiguracaoIA = new ObterConfiguracaoIA(configuracaoIA)
  const iaControlador = new IAControlador(
    obterConfiguracaoIA,
    new SalvarConfiguracaoIA(configuracaoIA, obterConfiguracaoIA),
    new TestarIA(provedorIA),
    new ConversarComAssistente(
      provedorIA,
      new MontadorContexto(pessoaRepositorio, obterSaude, obterPrevisao, listarObjetivos, obterPlanoDividas, obterAnalise),
      interpretarLancamentos
    ),
    interpretarLancamentos,
    confirmarLancamentos
  )
  // Acesso: troque EnvioEmailPendente por um provedor real para a recuperação de senha funcionar.
  const sessao = new SessaoAtual()
  const acesso: DependenciasAcesso = {
    usuarios: new UsuarioRepositorioSqlite(banco),
    sessoes: new SessaoRepositorioSqlite(banco),
    codigos: new CodigoRecuperacaoRepositorioSqlite(banco),
    pessoas: pessoaRepositorio,
    hash: new HashSenhaScrypt(),
    segredos: new GeradorSegredosCripto(),
    guarda: new GuardaSessaoSegura(configuracoes, cofre),
    email: new EnvioEmailPendente(desenvolvimento),
    sessao
  }
  const autenticacaoControlador = new AutenticacaoControlador(
    new ObterEstadoAutenticacao(acesso),
    new CadastrarUsuario(acesso),
    new Entrar(acesso),
    new Sair(acesso),
    new SolicitarRecuperacaoSenha(acesso),
    new RedefinirSenha(acesso),
    new AlterarSenha(acesso),
    new ListarUsuarios(acesso)
  )

  const importacaoControlador = new ImportacaoControlador(
    new LerContracheque(provedorIA),
    new ConfirmarContracheque(
      transacaoRepositorio,
      new ConfirmarTransacao(transacaoRepositorio, sincronizarRecorrencias),
      new CriarTransacao(transacaoRepositorio, pessoaRepositorio, categoriaRepositorio)
    ),
    new LerNotaFiscal(new SefazNfceConsulta(), provedorIA)
  )

  return {
    banco,
    armazenamento,
    sessao,
    situacaoSistema: (): SituacaoSistemaDTO => ({ versao, dadosCifrados: armazenamento.cifrado }),
    autenticacaoControlador,
    pessoaControlador,
    categoriaControlador,
    transacaoControlador,
    painelControlador,
    cartaoControlador,
    taxaControlador,
    recorrenciaControlador,
    previsaoControlador,
    saudeControlador,
    analiseControlador,
    objetivoControlador,
    perfilControlador,
    dividaControlador,
    iaControlador,
    ajustesControlador,
    contaControlador,
    importacaoControlador
  }
}

export type Container = ReturnType<typeof criarContainer>
