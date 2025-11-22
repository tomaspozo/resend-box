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
      headers: parsed.headers.getMap() as Record<string, string>,
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
    disabledCommands: ['AUTH'],
    onData(stream, session, callback) {
      // Parse the incoming email stream
      simpleParser(stream)
        .then((parsed: ParsedMail) => {
          try {
            const normalized = normalizeSmtpMail(parsed);
            addEmail(store, normalized);
            console.log(`📧 SMTP email received from ${normalized.from} to ${normalized.to.join(', ')}`);
            callback();
          } catch (error) {
            console.error('Error processing SMTP email:', error);
            callback(error as Error);
          }
        })
        .catch((error) => {
          console.error('Error parsing SMTP email:', error);
          callback(error);
        });
    },
    onConnect(session, callback) {
      // Accept all connections (sandbox mode)
      callback();
    },
  };

  const server = new SMTPServer(options);

  server.listen(port, () => {
    console.log(`📬 SMTP server listening on port ${port}`);
  });

  // SMTPServer extends EventEmitter and should have close method
  // Return server with explicit close method signature for TypeScript
  return server as SMTPServer & { close: (callback?: () => void) => void };
};

