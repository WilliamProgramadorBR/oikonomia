export interface EmailSaida {
  para: string
  assunto: string
  texto: string
  html?: string
}

// Envio de e-mails (recuperação de senha). Implemente com o provedor que preferir
// (SMTP, Resend, SendGrid, Amazon SES...) e troque no container.
export interface IEnvioEmail {
  enviar(email: EmailSaida): Promise<void>
}
