import express, { type Express, type Request, type Response } from 'express';
import type { EmailStore, ResendEmailPayload, ResendEmailResponse } from './types.js';
import { addEmail } from './store.js';
import { renderReactEmail } from './react-renderer.js';

/**
 * Normalizes a Resend email payload into our internal Email format
 */
const normalizeResendPayload = (
  payload: ResendEmailPayload,
): Omit<import('./types.js').Email, 'id' | 'createdAt'> => {
  const normalizeArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  return {
    source: 'resend',
    from: payload.from,
    to: normalizeArray(payload.to),
    cc: payload.cc ? normalizeArray(payload.cc) : undefined,
    bcc: payload.bcc ? normalizeArray(payload.bcc) : undefined,
    replyTo: payload.replyTo ? normalizeArray(payload.replyTo) : undefined,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    raw: undefined, // Will be set by the caller
  };
};

/**
 * Creates the Resend API mock server
 */
export const createResendApiServer = (store: EmailStore, port: number = 4657): Express => {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Resend API endpoint: POST /emails
  app.post('/emails', async (req: Request, res: Response) => {
    try {
      const payload = req.body as ResendEmailPayload;

      // Validate required fields
      if (!payload.from || !payload.to || !payload.subject) {
        return res.status(400).json({
          message: 'Missing required fields: from, to, subject',
        });
      }

      // Handle React email rendering if provided
      let html = payload.html;
      if (payload.react && !html) {
        try {
          html = await renderReactEmail(payload.react);
        } catch (error) {
          console.warn('Failed to render React email:', error);
          // Continue without HTML if React rendering fails
        }
      }

      // Normalize and store the email
      const normalized = normalizeResendPayload({ ...payload, html });
      
      // Store the original request data (exclude react since it's already rendered)
      const { react, ...payloadToStore } = payload;
      normalized.raw = {
        request: {
          payload: payloadToStore,
          headers: Object.keys(req.headers).reduce((acc, key) => {
            const value = req.headers[key];
            if (value) {
              acc[key] = Array.isArray(value) ? value.join(', ') : String(value);
            }
            return acc;
          }, {} as Record<string, string>),
        },
      };
      
      const email = addEmail(store, normalized);

      // Return Resend-compatible response
      const response: ResendEmailResponse = {
        id: email.id,
        created_at: new Date(email.createdAt).toISOString(),
        to: email.to,
        from: email.from,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error processing Resend email:', error);
      return res.status(500).json({
        message: 'Internal server error',
      });
    }
  });

  return app;
};

