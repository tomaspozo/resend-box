/**
 * Resend API payload type - mirrors the subset of resend-node emails.send() input we support
 * Based on: https://github.com/resend/resend-node
 */
export type ResendEmailPayload = {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string | string[]
  react?: unknown // React component/element - will be rendered server-side
  cc?: string | string[]
  bcc?: string | string[]
}

/**
 * Normalized email type that unifies both Resend API and SMTP sources
 */
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
      payload?: ResendEmailPayload
      headers?: Record<string, string>
    }
  }
}

/**
 * Email store state
 */
export type EmailStore = {
  emails: Email[]
}

/**
 * Resend API response type (matching resend-node response structure)
 */
export type ResendEmailResponse = {
  id: string
  created_at: string
  to: string[]
  from: string
}

/**
 * Web API response types for the UI
 */
export type WebApiEmailListResponse = {
  emails: Email[]
}

export type WebApiEmailResponse = {
  email: Email
}

export type WebApiErrorResponse = {
  error: string
}

export type WebApiMessageResponse = {
  message: string
}

export type WebApiConfigResponse = {
  httpPort: number
  smtpPort: number
}
