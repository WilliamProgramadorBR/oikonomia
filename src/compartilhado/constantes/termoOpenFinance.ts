// Termo de ciência do Open Finance. Se o conteúdo mudar de forma relevante, suba a versão:
// quem aceitou a anterior precisará ler e aceitar de novo antes de continuar usando.
export const VERSAO_TERMO_OPEN_FINANCE = '1.0 · 03/11/2026'

export interface SecaoTermo {
  titulo: string
  paragrafos: string[]
}

export const TERMO_OPEN_FINANCE: SecaoTermo[] = [
  {
    titulo: '1. É opcional',
    paragrafos: [
      'O Open Finance é um recurso extra. Todo o app funciona sem ele: você pode lançar à mão ou importar o extrato (OFX/CSV) sem conectar nada.',
      'Você pode desativar quando quiser, sem perder o resto dos seus dados.'
    ]
  },
  {
    titulo: '2. Quem participa',
    paragrafos: [
      'Você, titular das contas, que decide o que compartilhar.',
      'O seu banco, que envia os dados somente depois da sua autorização no ambiente dele.',
      'A Pluggy, empresa autorizada pelo Banco Central a receber dados do Open Finance. Ela recebe os dados do banco e os entrega ao app, segundo os termos e a política de privacidade dela (pluggy.ai).',
      'O Projeto Financeiro, programa que roda só no seu computador. Ele não tem servidor próprio: o autor do app não recebe, não vê e não guarda nenhum dado seu.'
    ]
  },
  {
    titulo: '3. A conta na Pluggy é sua',
    paragrafos: [
      'Para usar, você cria a sua própria conta e aplicação na Pluggy (dashboard.pluggy.ai) e cola aqui o Client ID e o Client Secret.',
      'Eventuais custos, limites e regras de uso são os do seu plano com a Pluggy, combinados diretamente entre você e ela.',
      'Não compartilhe essas credenciais com ninguém: quem tiver as duas pode acessar os dados conectados na sua conta Pluggy.'
    ]
  },
  {
    titulo: '4. Quais dados são buscados',
    paragrafos: [
      'Somente contas (tipo, nome, final do número e saldo) e transações das contas que você conectar.',
      'O app pede à Pluggy apenas esses dois produtos. Ele não solicita dados de identidade, investimentos, empréstimos ou cartões de outras pessoas.',
      'Nada é gravado automaticamente: cada sincronização mostra os lançamentos para você revisar e confirmar, como na importação de extrato.'
    ]
  },
  {
    titulo: '5. Onde os dados ficam',
    paragrafos: [
      'No seu computador, dentro do banco de dados do app, cifrado com AES-256-GCM e com a chave protegida pelo cofre do Windows (ou do macOS).',
      'As credenciais da Pluggy também ficam cifradas pelo cofre do sistema e nunca são exibidas de volta.',
      'No caminho entre o banco, a Pluggy e o seu computador, os dados trafegam por conexão segura (HTTPS). Na Pluggy, eles seguem a política de privacidade dela.'
    ]
  },
  {
    titulo: '6. Sua senha do banco',
    paragrafos: [
      'A autorização acontece no ambiente do seu banco, aberto no navegador do sistema. O Projeto Financeiro nunca vê, recebe ou guarda a senha do seu banco.',
      'A tela de conexão da Pluggy abre numa janela separada, sem acesso aos dados do app.'
    ]
  },
  {
    titulo: '7. Prazo e cancelamento do consentimento',
    paragrafos: [
      'No Open Finance, o compartilhamento tem prazo (até 12 meses) e precisa ser renovado no banco depois disso.',
      'Você pode cancelar a qualquer momento: no app (Desconectar), no app do seu banco (Open Finance → consentimentos) e na sua conta da Pluggy.',
      'Ao desconectar no app, a conexão também é apagada na Pluggy. Os lançamentos que você já importou continuam no app até você apagá-los.'
    ]
  },
  {
    titulo: '8. Inteligência artificial',
    paragrafos: [
      'As transações importadas não são enviadas linha a linha para nenhuma IA. Se você usa o Gemini, ele recebe apenas o resumo de números que já é informado em Configurações.'
    ]
  },
  {
    titulo: '9. Riscos e responsabilidades',
    paragrafos: [
      'Quem usar o seu computador com a sua sessão aberta pode ver os dados. Proteja o seu usuário do Windows com senha e saia do app quando não estiver usando.',
      'O app é software livre (licença MIT), fornecido "como está", sem garantias. Confira os lançamentos antes de importar.',
      'Bancos e a Pluggy podem mudar ou interromper o serviço; nesse caso, você continua podendo usar a importação de extrato.'
    ]
  },
  {
    titulo: '10. Seus direitos (LGPD)',
    paragrafos: [
      'No app, você pode ver, corrigir e apagar os seus dados a qualquer momento.',
      'Perante o banco e a Pluggy, você exerce os seus direitos (acesso, correção, eliminação, revogação do consentimento) pelos canais deles.'
    ]
  }
]

export const DECLARACAO_ACEITE =
  'Li e entendi este termo. Quero ativar o Open Finance com a minha própria conta na Pluggy, sabendo que é opcional e que posso cancelar quando quiser.'
