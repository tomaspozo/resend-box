import express, { type Express, type Request, type Response } from 'express';
import type {
  EmailStore,
  WebApiEmailListResponse,
  WebApiEmailResponse,
  WebApiErrorResponse,
  WebApiMessageResponse,
  WebApiConfigResponse,
} from './types.js';
import { listEmails, findEmailById, clearEmails, removeEmail } from './store.js';

/**
 * Creates the Web API server for the UI
 */
export const createWebApiServer = (store: EmailStore, httpPort: number, smtpPort: number): Express => {
  const app = express();

  app.use(express.json());

  // Enable CORS for local development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  /**
   * GET /sandbox/emails
   * Returns a list of all emails in reverse chronological order (newest first)
   * Response: { emails: Email[] }
   */
  app.get('/sandbox/emails', (req: Request, res: Response<WebApiEmailListResponse | WebApiErrorResponse>) => {
    try {
      const emails = listEmails(store);
      const response: WebApiEmailListResponse = { emails };
      return res.json(response);
    } catch (error) {
      console.error('Error listing emails:', error);
      const errorResponse: WebApiErrorResponse = { error: 'Internal server error' };
      return res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /sandbox/emails/:id
   * Returns a specific email by ID
   * Response: { email: Email } or 404 { error: string }
   */
  app.get('/sandbox/emails/:id', (req: Request, res: Response<WebApiEmailResponse | WebApiErrorResponse>) => {
    try {
      const { id } = req.params;
      const email = findEmailById(store, id);
      if (!email) {
        const errorResponse: WebApiErrorResponse = { error: 'Email not found' };
        return res.status(404).json(errorResponse);
      }
      const response: WebApiEmailResponse = { email };
      return res.json(response);
    } catch (error) {
      console.error('Error fetching email:', error);
      const errorResponse: WebApiErrorResponse = { error: 'Internal server error' };
      return res.status(500).json(errorResponse);
    }
  });

  /**
   * DELETE /sandbox/emails
   * Clears all emails from the store
   * Response: { message: string }
   */
  app.delete('/sandbox/emails', (req: Request, res: Response<WebApiMessageResponse | WebApiErrorResponse>) => {
    try {
      clearEmails(store);
      const response: WebApiMessageResponse = { message: 'All emails cleared' };
      return res.json(response);
    } catch (error) {
      console.error('Error clearing emails:', error);
      const errorResponse: WebApiErrorResponse = { error: 'Internal server error' };
      return res.status(500).json(errorResponse);
    }
  });

  /**
   * DELETE /sandbox/emails/:id
   * Deletes a specific email by ID
   * Response: { message: string } or 404 { error: string }
   */
  app.delete('/sandbox/emails/:id', (req: Request, res: Response<WebApiMessageResponse | WebApiErrorResponse>) => {
    try {
      const { id } = req.params;
      const deleted = removeEmail(store, id);
      if (!deleted) {
        const errorResponse: WebApiErrorResponse = { error: 'Email not found' };
        return res.status(404).json(errorResponse);
      }
      const response: WebApiMessageResponse = { message: 'Email deleted' };
      return res.json(response);
    } catch (error) {
      console.error('Error deleting email:', error);
      const errorResponse: WebApiErrorResponse = { error: 'Internal server error' };
      return res.status(500).json(errorResponse);
    }
  });

  /**
   * GET /sandbox/config
   * Returns the server configuration (ports)
   * Response: { httpPort: number, smtpPort: number }
   */
  app.get('/sandbox/config', (req: Request, res: Response<WebApiConfigResponse | WebApiErrorResponse>) => {
    try {
      const response: WebApiConfigResponse = { httpPort, smtpPort };
      return res.json(response);
    } catch (error) {
      console.error('Error fetching config:', error);
      const errorResponse: WebApiErrorResponse = { error: 'Internal server error' };
      return res.status(500).json(errorResponse);
    }
  });

  return app;
};

