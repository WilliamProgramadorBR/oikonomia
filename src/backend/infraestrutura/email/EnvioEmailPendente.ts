import type { EmailSaida, IEnvioEmail } from '../../dominio/portas/IEnvioEmail'

// Envio de e-mail ainda NÃO ligado a um provedor.
// Para ligar: crie uma classe que implemente IEnvioEmail (ex.: EnvioEmailSmtp com nodemailer,
// ou chamando a API do Resend/SendGrid) e troque esta no container (`envioEmail`).
// Em desenvolvimento o e-mail aparece no terminal para dar para testar a recuperação.
export class EnvioEmailPendente implements IEnvioEmail {
  constructor(private readonly mostrarNoTerminal: boolean) {}

  async enviar(email: EmailSaida): Promise<void> {
    if (this.mostrarNoTerminal) {
      console.info(`\n[e-mail não enviado: provedor não configurado]\nPara: ${email.para}\nAssunto: ${email.assunto}\n\n${email.texto}\n`)
      return
    }
    console.warn('[e-mail] provedor não configurado; mensagem descartada.')
  }
}
