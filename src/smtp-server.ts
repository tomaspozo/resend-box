import { SMTPServer, type SMTPServerOptions } from 'smtp-server'
import { simpleParser, type ParsedMail, type AddressObject } from 'mailparser'
import type { EmailStore } from './types.js'
import { addEmail } from './store.js'

/**
 * Normalizes a parsed SMTP mail into our internal Email format
 */
const normalizeSmtpMail = (
  parsed: ParsedMail
): Omit<import('./types.js').Email, 'id' | 'createdAt'> => {
  const normalizeAddresses = (
    addresses?: Array<{ address?: string }>
  ): string[] => {
    if (!addresses) return []
    return addresses.map((addr) => addr.address || '').filter(Boolean)
  }

  const normalizeAddressObject = (
    addrObj?: AddressObject | AddressObject[]
  ): string[] => {
    if (!addrObj) return []
    const objects = Array.isArray(addrObj) ? addrObj : [addrObj]
    return objects.flatMap((obj) => normalizeAddresses(obj.value))
  }

  // Convert headers to a plain object with all values as strings
  const normalizeHeaderValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return String(value)
    }
    if (typeof value === 'string') {
      return value
    }
    if (Array.isArray(value)) {
      return value.map((v) => normalizeHeaderValue(v)).join(', ')
    }
    if (typeof value === 'object') {
      // Handle mailparser address objects
      const obj = value as Record<string, unknown>
      if (obj.address && typeof obj.address === 'string') {
        return obj.name ? `${obj.name} <${obj.address}>` : obj.address
      }
      if (obj.value !== undefined) {
        return normalizeHeaderValue(obj.value)
      }
      if (obj.text && typeof obj.text === 'string') {
        return obj.text
      }
      // For other objects, try JSON stringify
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  const headersObj: Record<string, string> = {}
  if (parsed.headers) {
    // mailparser headers can be a Map or an object
    if (parsed.headers instanceof Map) {
      parsed.headers.forEach((value: unknown, key: string) => {
        headersObj[key] = normalizeHeaderValue(value)
      })
    } else if (typeof (parsed.headers as any).getMap === 'function') {
      // Fallback for older API
      const headerMap = (parsed.headers as any).getMap()
      for (const [key, value] of Object.entries(headerMap)) {
        headersObj[key] = normalizeHeaderValue(value)
      }
    } else {
      // Headers might already be an object
      for (const [key, value] of Object.entries(parsed.headers)) {
        headersObj[key] = normalizeHeaderValue(value)
      }
    }
  }

  return {
    source: 'smtp',
    from: parsed.from?.value[0]?.address || 'unknown@localhost',
    to: normalizeAddressObject(parsed.to),
    cc: parsed.cc ? normalizeAddressObject(parsed.cc) : undefined,
    bcc: parsed.bcc ? normalizeAddressObject(parsed.bcc) : undefined,
    replyTo: parsed.replyTo
      ? normalizeAddressObject(parsed.replyTo)
      : undefined,
    subject: parsed.subject || '(no subject)',
    text: parsed.text || undefined,
    html: parsed.html || undefined,
    raw: {
      headers: headersObj,
      mime: parsed.textAsHtml || undefined,
    },
  }
}

/**
 * Creates and starts an SMTP server
 */
export const createSmtpServer = (
  store: EmailStore,
  port: number = 1025
): SMTPServer => {
  const options: SMTPServerOptions = {
    name: 'resend-box',
    authOptional: true,
    disabledCommands: ['AUTH', 'STARTTLS'],
    secure: false,
    onData(stream, session, callback) {
      // Parse the incoming email stream
      simpleParser(stream)
        .then((parsed: ParsedMail) => {
          try {
            const normalized = normalizeSmtpMail(parsed)
            addEmail(store, normalized)
            console.log(
              `📧 SMTP email received from ${normalized.from} to ${normalized.to.join(', ')}`
            )
            // Success - call callback without error
            callback()
          } catch (error) {
            console.error('❌ Error processing SMTP email:', error)
            // Log error but still accept the email to keep server running
            // Return a generic error response instead of crashing
            const err =
              error instanceof Error ? error : new Error(String(error))
            callback(err)
          }
        })
        .catch((error: unknown) => {
          console.error('❌ Error parsing SMTP email:', error)
          // Log error but don't crash - return error to client
          const err = error instanceof Error ? error : new Error(String(error))
          callback(err)
        })
    },
    onConnect(session, callback) {
      // Log connection attempts
      const remoteAddress = session.remoteAddress || 'unknown'
      const remotePort = session.remotePort || 'unknown'
      const hostname =
        (session as any).hostname || session.remoteAddress || 'unknown'
      console.log(
        `🔌 SMTP connection attempt from ${remoteAddress}:${remotePort} (${hostname})`
      )

      // Log session details for debugging
      console.log(`   Session details:`, {
        id: session.id,
        remoteAddress: session.remoteAddress,
        remotePort: session.remotePort,
        hostname: (session as any).hostname,
        clientHostname: session.clientHostname,
      })

      try {
        // Accept all connections (sandbox mode)
        callback()
        console.log(
          `✅ SMTP connection accepted from ${remoteAddress}:${remotePort}`
        )
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        console.error(
          `❌ Error accepting connection from ${remoteAddress}:${remotePort}:`,
          err.message
        )
        console.error(`   Error stack:`, err.stack)
        // Reject the connection with the error
        callback(err)
      }
    },
    onMailFrom(address, session, callback) {
      const remoteAddress = session.remoteAddress || 'unknown'
      // address is an AddressObject, extract the email
      const email = address.address || String(address)
      console.log(`📨 MAIL FROM: ${email} (from ${remoteAddress})`)
      // Accept all senders in sandbox mode
      callback()
    },
    onRcptTo(address, session, callback) {
      const remoteAddress = session.remoteAddress || 'unknown'
      // address is an AddressObject, extract the email
      const email = address.address || String(address)
      console.log(`📨 RCPT TO: ${email} (from ${remoteAddress})`)
      // Accept all recipients in sandbox mode
      callback()
    },
    onAuth(auth, session, callback) {
      const remoteAddress = session.remoteAddress || 'unknown'
      console.log(`🔐 AUTH attempt from ${remoteAddress} (but disabled)`)
      callback(new Error('AUTH not supported'))
    },
  }

  const server = new SMTPServer(options)

  // Handle SMTP server errors - don't crash the entire application
  server.on('error', (error: Error) => {
    console.error('❌ SMTP server error:', error.message)
    console.error('   Error name:', error.name)
    console.error('   Error code:', (error as any).code)
    console.error('   Error stack:', error.stack)
    // Don't exit - keep the server running for other connections
  })

  server.on('close', () => {
    console.log('📬 SMTP server closed')
  })

  // Bind to 0.0.0.0 to accept connections from Docker containers and other hosts
  const listener = server.listen(port, '0.0.0.0', () => {
    console.log(
      `📬 SMTP server listening on 0.0.0.0:${port} (accepting connections from all interfaces)`
    )
  })

  // Handle socket-level errors (before onConnect is called)
  listener.on('error', (error: NodeJS.ErrnoException) => {
    console.error('❌ SMTP listener error:', error.message)
    console.error('   Error code:', error.code)
    console.error('   Error syscall:', error.syscall)
    if ('address' in error) {
      console.error('   Error address:', error.address)
    }
    if ('port' in error) {
      console.error('   Error port:', error.port)
    }
  })

  // Handle connection errors at the socket level
  listener.on('connection', (socket) => {
    const remoteAddress = socket.remoteAddress || 'unknown'
    const remotePort = socket.remotePort || 'unknown'
    console.log(`🔌 Socket connection from ${remoteAddress}:${remotePort}`)

    socket.on('error', (error: Error) => {
      console.error(
        `❌ Socket error from ${remoteAddress}:${remotePort}:`,
        error.message
      )
      console.error('   Error code:', (error as any).code)
    })

    socket.on('close', (hadError: boolean) => {
      if (hadError) {
        console.error(
          `❌ Socket closed with error from ${remoteAddress}:${remotePort}`
        )
      } else {
        console.log(
          `🔌 Socket closed normally from ${remoteAddress}:${remotePort}`
        )
      }
    })

    socket.on('timeout', () => {
      console.warn(`⏱️  Socket timeout from ${remoteAddress}:${remotePort}`)
    })
  })

  // SMTPServer extends EventEmitter and should have close method
  // Return server with explicit close method signature for TypeScript
  return server as SMTPServer & { close: (callback?: () => void) => void }
}
