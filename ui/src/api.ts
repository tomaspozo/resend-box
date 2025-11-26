import type { Email } from './types'

const API_BASE = '/sandbox'

export const fetchEmails = async (): Promise<Email[]> => {
  const response = await fetch(`${API_BASE}/emails`)
  if (!response.ok) {
    throw new Error('Failed to fetch emails')
  }
  const data = await response.json()
  return data.emails
}

export const fetchEmail = async (id: string): Promise<Email> => {
  const response = await fetch(`${API_BASE}/emails/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch email')
  }
  const data = await response.json()
  return data.email
}

export const deleteEmail = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/emails/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete email')
  }
}

export const clearAllEmails = async (): Promise<void> => {
  const response = await fetch(`${API_BASE}/emails`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to clear emails')
  }
}

export type ServerConfig = {
  httpPort: number
  smtpPort: number
}

export const fetchConfig = async (): Promise<ServerConfig> => {
  const response = await fetch(`${API_BASE}/config`)
  if (!response.ok) {
    throw new Error('Failed to fetch config')
  }
  const data = await response.json()
  return data
}
