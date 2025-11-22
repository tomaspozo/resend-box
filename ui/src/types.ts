export type Email = {
  id: string;
  source: 'resend' | 'smtp';
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  text?: string;
  html?: string;
  createdAt: number;
  raw?: {
    headers?: Record<string, string>;
    mime?: string;
  };
};

