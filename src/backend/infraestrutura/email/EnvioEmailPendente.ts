import type { EmailSaida, IEnvioEmail } from '../../dominio/portas/IEnvioEmail'

// Envio de e-mail ainda NÃO ligado a um provedor.
// Para ligar: crie uma classe que implemente IEnvioEmail (ex.: EnvioEmailSmtp com nodemailer,
// ou chamando a API do Resend/SendGrid) e troque esta no container (`envioEmail`).
// Nunca registra destinatário, assunto, código ou corpo: são dados pessoais e segredos temporários.
export class EnvioEmailPendente implements IEnvioEmail {
  constructor(_desenvolvimento: boolean) {}

  async enviar(_email: EmailSaida): Promise<void> {
    console.warn('[e-mail] provedor não configurado; nenhuma mensagem foi enviada.')
    throw new Error('Provedor de e-mail não configurado.')
  }
}
