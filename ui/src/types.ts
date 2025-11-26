export type Email = {
  id: string
  source: 'resend' | 'smtp'
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  replyTo?: string[]
  subject: string
  text?: string
  html?: string
  createdAt: number
  raw?: {
    headers?: Record<string, string>
    mime?: string
    // For Resend API emails
    request?: {
      payload?: Record<string, unknown>
      headers?: Record<string, string>
    }
  }
}
