/**
 * Integration tests for Resend Box
 * Run with: npm test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createStore } from '../server/store.js'
import { createResendApiServer } from '../server/resend-api.js'
import { createSmtpServer } from '../server/smtp-server.js'
import { createWebApiServer } from '../server/web-api.js'
import type { EmailStore } from '../server/types.js'
import express from 'express'
import type { Server } from 'http'
import { createConnection } from 'net'

/**
 * Helper function to send an email via SMTP
 * Uses a simple state machine to track the SMTP conversation
 */
const sendSmtpEmail = async (
  port: number,
  email: {
    from: string
    to: string | string[]
    subject: string
    text?: string
    html?: string
  }
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const client = createConnection({ port, host: '127.0.0.1' })
    let buffer = ''
    let state: 'greeting' | 'ehlo' | 'mail' | 'rcpt' | 'data' | 'body' | 'quit' =
      'greeting'

    const processResponse = (response: string) => {
      const code = response.substring(0, 3)
      const isMultiline = response[3] === '-'

      // Skip multiline responses until we get the final one
      if (isMultiline) return

      if (code.startsWith('5') || code.startsWith('4')) {
        client.end()
        reject(new Error(`SMTP error: ${response}`))
        return
      }

      switch (state) {
        case 'greeting':
          if (code === '220') {
            state = 'ehlo'
            client.write('EHLO localhost\r\n')
          }
          break
        case 'ehlo':
          if (code === '250') {
            state = 'mail'
            client.write(`MAIL FROM:<${email.from}>\r\n`)
          }
          break
        case 'mail':
          if (code === '250') {
            state = 'rcpt'
            const recipients = Array.isArray(email.to) ? email.to : [email.to]
            client.write(`RCPT TO:<${recipients[0]}>\r\n`)
          }
          break
        case 'rcpt':
          if (code === '250') {
            state = 'data'
            client.write('DATA\r\n')
          }
          break
        case 'data':
          if (code === '354') {
            state = 'body'
            const recipients = Array.isArray(email.to) ? email.to : [email.to]
            const lines = [
              `From: ${email.from}`,
              `To: ${recipients.join(', ')}`,
              `Subject: ${email.subject}`,
            ]
            if (email.html) {
              lines.push('Content-Type: text/html; charset=utf-8')
            }
            lines.push('', email.html || email.text || '', '.')
            client.write(lines.join('\r\n') + '\r\n')
          }
          break
        case 'body':
          if (code === '250') {
            state = 'quit'
            client.write('QUIT\r\n')
          }
          break
        case 'quit':
          if (code === '221') {
            client.end()
            resolve()
          }
          break
      }
    }

    client.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\r\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line) processResponse(line)
      }
    })

    client.on('error', reject)
    client.on('close', () => {
      // If we reached quit state, consider it success
      if (state === 'quit') {
        resolve()
      }
    })

    setTimeout(() => {
      client.end()
      reject(new Error('SMTP connection timeout'))
    }, 5000)
  })
}

describe('Resend Box Integration', () => {
  let store: EmailStore
  let httpServer: Server
  let smtpServer: ReturnType<typeof createSmtpServer>
  const httpPort = 4658 // Use different port for testing
  const smtpPort = 1026 // Use different port for testing

  beforeAll(() => {
    store = createStore()
    const resendApi = createResendApiServer(store, httpPort)
    const webApi = createWebApiServer(store, httpPort, smtpPort)
    const app = express()
    app.use(resendApi)
    app.use(webApi)
    httpServer = app.listen(httpPort)
    smtpServer = createSmtpServer(store, smtpPort)
  })

  beforeEach(() => {
    // Clear store before each test
    store.emails = []
  })

  afterAll(() => {
    httpServer.close()
    if (typeof smtpServer.close === 'function') {
      smtpServer.close()
    }
  })

  it('should accept Resend API emails', async () => {
    const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      }),
    })

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.id).toBeDefined()
    expect(data.from).toBe('test@example.com')
    expect(store.emails.length).toBe(1)
  })

  it('should validate required fields', async () => {
    const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test@example.com',
        // Missing 'to' and 'subject'
      }),
    })

    expect(response.status).toBe(400)
  })

  it('should handle HTML emails', async () => {
    const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'HTML Email',
        html: '<h1>Hello</h1><p>World</p>',
      }),
    })

    expect(response.ok).toBe(true)
    const email = store.emails.find((e) => e.subject === 'HTML Email')
    expect(email?.html).toBe('<h1>Hello</h1><p>World</p>')
  })

  it('should handle multiple recipients', async () => {
    const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test@example.com',
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Multi-recipient Email',
        text: 'Hello everyone',
      }),
    })

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.to).toEqual(['user1@example.com', 'user2@example.com'])
    const email = store.emails.find((e) => e.id === data.id)
    expect(email?.to).toEqual(['user1@example.com', 'user2@example.com'])
  })

  it('should handle CC and BCC fields', async () => {
    const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'user@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Email with CC/BCC',
        text: 'Hello',
      }),
    })

    expect(response.ok).toBe(true)
    const email = store.emails.find((e) => e.subject === 'Email with CC/BCC')
    expect(email?.cc).toEqual(['cc@example.com'])
    expect(email?.bcc).toEqual(['bcc@example.com'])
  })

  describe('SMTP Integration', () => {
    it('should accept emails via SMTP', async () => {
      await sendSmtpEmail(smtpPort, {
        from: 'smtp@example.com',
        to: 'recipient@example.com',
        subject: 'SMTP Test Email',
        text: 'This is a test email sent via SMTP',
      })

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(store.emails.length).toBe(1)
      const email = store.emails[0]
      expect(email.source).toBe('smtp')
      expect(email.from).toBe('smtp@example.com')
      expect(email.to).toContain('recipient@example.com')
      expect(email.subject).toBe('SMTP Test Email')
      expect(email.text).toContain('test email')
    })

    it('should handle HTML emails via SMTP', async () => {
      await sendSmtpEmail(smtpPort, {
        from: 'smtp@example.com',
        to: 'recipient@example.com',
        subject: 'SMTP HTML Email',
        html: '<h1>Hello from SMTP</h1><p>This is HTML</p>',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const email = store.emails.find((e) => e.subject === 'SMTP HTML Email')
      expect(email).toBeDefined()
      expect(email?.html).toContain('Hello from SMTP')
    })

    it('should preserve raw headers from SMTP emails', async () => {
      await sendSmtpEmail(smtpPort, {
        from: 'smtp@example.com',
        to: 'recipient@example.com',
        subject: 'SMTP with Headers',
        text: 'Test',
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const email = store.emails.find((e) => e.subject === 'SMTP with Headers')
      expect(email?.raw).toBeDefined()
      expect(email?.raw?.headers).toBeDefined()
    })
  })

  describe('Web API Integration', () => {
    beforeEach(async () => {
      // Add some test emails with a small delay to ensure different timestamps
      await fetch(`http://127.0.0.1:${httpPort}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'test1@example.com',
          to: 'user1@example.com',
          subject: 'Test Email 1',
          text: 'First email',
        }),
      })
      // Small delay to ensure different createdAt timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))
      await fetch(`http://127.0.0.1:${httpPort}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'test2@example.com',
          to: 'user2@example.com',
          subject: 'Test Email 2',
          text: 'Second email',
        }),
      })
    })

    it('should list all emails via GET /sandbox/emails', async () => {
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails`
      )
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.emails).toBeDefined()
      expect(Array.isArray(data.emails)).toBe(true)
      expect(data.emails.length).toBe(2)
      expect(data.emails[0].subject).toBe('Test Email 2') // Newest first
      expect(data.emails[1].subject).toBe('Test Email 1')
    })

    it('should return emails in reverse chronological order', async () => {
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails`
      )
      const data = await response.json()
      const emails = data.emails
      for (let i = 0; i < emails.length - 1; i++) {
        expect(emails[i].createdAt).toBeGreaterThanOrEqual(
          emails[i + 1].createdAt
        )
      }
    })

    it('should get a specific email via GET /sandbox/emails/:id', async () => {
      const listResponse = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails`
      )
      const listData = await listResponse.json()
      const emailId = listData.emails[0].id

      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails/${emailId}`
      )
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.email).toBeDefined()
      expect(data.email.id).toBe(emailId)
      expect(data.email.subject).toBe('Test Email 2')
    })

    it('should return 404 for non-existent email', async () => {
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails/nonexistent-id`
      )
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Email not found')
    })

    it('should delete a specific email via DELETE /sandbox/emails/:id', async () => {
      const listResponse = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails`
      )
      const listData = await listResponse.json()
      const emailId = listData.emails[0].id

      const deleteResponse = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails/${emailId}`,
        {
          method: 'DELETE',
        }
      )
      expect(deleteResponse.ok).toBe(true)

      const getResponse = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails/${emailId}`
      )
      expect(getResponse.status).toBe(404)
    })

    it('should return 404 when deleting non-existent email', async () => {
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails/nonexistent-id`,
        {
          method: 'DELETE',
        }
      )
      expect(response.status).toBe(404)
    })

    it('should clear all emails via DELETE /sandbox/emails', async () => {
      const deleteResponse = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails`,
        {
          method: 'DELETE',
        }
      )
      expect(deleteResponse.ok).toBe(true)

      const listResponse = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails`
      )
      const listData = await listResponse.json()
      expect(listData.emails.length).toBe(0)
    })

    it('should handle empty email list', async () => {
      // Clear emails first
      await fetch(`http://127.0.0.1:${httpPort}/sandbox/emails`, {
        method: 'DELETE',
      })

      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails`
      )
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.emails).toEqual([])
    })

    it('should filter emails by recipient with ?to query param', async () => {
      // Filter for user1@example.com
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails?to=user1@example.com`
      )
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.emails.length).toBe(1)
      expect(data.emails[0].to).toContain('user1@example.com')
    })

    it('should filter emails by partial recipient match', async () => {
      // Filter for any @example.com recipient
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails?to=example.com`
      )
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.emails.length).toBe(2)
    })

    it('should return empty array when no emails match filter', async () => {
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails?to=nonexistent@domain.com`
      )
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.emails).toEqual([])
    })

    it('should filter case-insensitively', async () => {
      const response = await fetch(
        `http://127.0.0.1:${httpPort}/sandbox/emails?to=USER1@EXAMPLE.COM`
      )
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.emails.length).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle large email payloads', async () => {
      const largeText = 'x'.repeat(100000) // 100KB of text
      const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Large Email',
          text: largeText,
        }),
      })

      expect(response.ok).toBe(true)
      const email = store.emails.find((e) => e.subject === 'Large Email')
      expect(email?.text?.length).toBe(100000)
    })

    it('should handle emails with special characters in subject', async () => {
      const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Email with "quotes" & <tags> & émojis 🎉',
          text: 'Test',
        }),
      })

      expect(response.ok).toBe(true)
      const email = store.emails.find((e) => e.subject.includes('émojis'))
      expect(email?.subject).toBe('Email with "quotes" & <tags> & émojis 🎉')
    })

    it('should handle missing optional fields gracefully', async () => {
      const response = await fetch(`http://127.0.0.1:${httpPort}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'test@example.com',
          to: 'user@example.com',
          subject: 'Minimal Email',
          // No text or html
        }),
      })

      expect(response.ok).toBe(true)
      const email = store.emails.find((e) => e.subject === 'Minimal Email')
      expect(email).toBeDefined()
      expect(email?.text).toBeUndefined()
      expect(email?.html).toBeUndefined()
    })
  })
})
