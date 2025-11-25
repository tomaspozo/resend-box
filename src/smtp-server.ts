import { SMTPServer, type SMTPServerOptions } from 'smtp-server';
import { simpleParser, type ParsedMail } from 'mailparser';
import type { EmailStore } from './types.js';
import { addEmail } from './store.js';

/**
 * Normalizes a parsed SMTP mail into our internal Email format
 */
const normalizeSmtpMail = (parsed: ParsedMail): Omit<import('./types.js').Email, 'id' | 'createdAt'> => {
  const normalizeAddresses = (addresses?: Array<{ address: string }>): string[] => {
    if (!addresses) return [];
    return addresses.map((addr) => addr.address);
  };

  // Convert headers to a plain object
  const headersObj: Record<string, string> = {};
  if (parsed.headers) {
    // mailparser headers can be a Map or an object
    if (parsed.headers instanceof Map) {
      parsed.headers.forEach((value, key) => {
        headersObj[key] = Array.isArray(value) ? value.join(', ') : String(value);
      });
    } else if (typeof parsed.headers.getMap === 'function') {
      // Fallback for older API
      Object.assign(headersObj, parsed.headers.getMap());
    } else {
      // Headers might already be an object
      Object.assign(headersObj, parsed.headers);
    }
  }

  return {
    source: 'smtp',
    from: parsed.from?.value[0]?.address || 'unknown@localhost',
    to: normalizeAddresses(parsed.to?.value),
    cc: parsed.cc ? normalizeAddresses(parsed.cc.value) : undefined,
    bcc: parsed.bcc ? normalizeAddresses(parsed.bcc.value) : undefined,
    replyTo: parsed.replyTo ? normalizeAddresses(parsed.replyTo.value) : undefined,
    subject: parsed.subject || '(no subject)',
    text: parsed.text || undefined,
    html: parsed.html || undefined,
    raw: {
      headers: headersObj,
      mime: parsed.textAsHtml || undefined,
    },
  };
};

/**
 * Creates and starts an SMTP server
 */
export const createSmtpServer = (
  store: EmailStore,
  port: number = 1025,
): SMTPServer => {
  const options: SMTPServerOptions = {
    name: 'resend-sandbox',
    authOptional: true,
    disabledCommands: ['AUTH', 'STARTTLS'],
    secure: false,
    onData(stream, session, callback) {
      // Parse the incoming email stream
      simpleParser(stream)
        .then((parsed: ParsedMail) => {
          try {
            const normalized = normalizeSmtpMail(parsed);
            addEmail(store, normalized);
            console.log(`📧 SMTP email received from ${normalized.from} to ${normalized.to.join(', ')}`);
            // Success - call callback without error
            callback();
          } catch (error) {
            console.error('❌ Error processing SMTP email:', error);
            // Log error but still accept the email to keep server running
            // Return a generic error response instead of crashing
            const err = error instanceof Error ? error : new Error(String(error));
            callback(err);
          }
        })
        .catch((error) => {
          console.error('❌ Error parsing SMTP email:', error);
          // Log error but don't crash - return error to client
          const err = error instanceof Error ? error : new Error(String(error));
          callback(err);
        });
    },
    onConnect(session, callback) {
      // Accept all connections (sandbox mode)
      callback();
    },
  };

  const server = new SMTPServer(options);

  // Handle SMTP server errors - don't crash the entire application
  server.on('error', (error: Error) => {
    console.error('❌ SMTP server error:', error.message);
    // Don't exit - keep the server running for other connections
  });

  server.on('close', () => {
    console.log('📬 SMTP server closed');
  });

  server.listen(port, () => {
    console.log(`📬 SMTP server listening on port ${port}`);
  });

  // Handle listen errors
  server.on('listening', () => {
    // Server successfully started
  });

  // SMTPServer extends EventEmitter and should have close method
  // Return server with explicit close method signature for TypeScript
  return server as SMTPServer & { close: (callback?: () => void) => void };
};

