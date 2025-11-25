# Resend Box

A local email sandbox that acts as both a Resend API mock and an SMTP server, with a modern web UI for inspecting captured emails.

## Features

- 🎯 **Resend API Compatible**: Mock the Resend API for local development
- 📧 **SMTP Server**: Accept emails via SMTP protocol
- 🎨 **Modern UI**: Beautiful web interface built with React and shadcn/ui
- 🚀 **Easy Setup**: One command to configure your project
- 🔍 **Email Inspection**: View HTML, text, and raw MIME content
- 🔄 **Real-time Updates**: Auto-refreshing email list

## Installation

```bash
npm install -g resend-box
# or
npx resend-box
```

## Quick Start

1. **Initialize your project** (optional, but recommended):
   ```bash
   npx resend-box init
   ```
   This will configure `RESEND_BASE_URL` in your `.env.local` or `.env` file.

2. **Start the sandbox**:
   ```bash
   npx resend-box
   ```

3. **View captured emails**:
   Open http://127.0.0.1:4657 in your browser.

## Usage

### Resend SDK

After running `init`, your Resend SDK will automatically use the local sandbox:

```typescript
import { Resend } from 'resend';

const resend = new Resend('re_test_...');

const { data } = await resend.emails.send({
  from: 'you@example.com',
  to: 'user@gmail.com',
  subject: 'Hello',
  html: '<p>Hello world!</p>',
});
```

### SMTP

Configure your application to send emails via SMTP to `127.0.0.1:1025` (default port).

## Configuration

### Default Ports

- **HTTP API (Resend mock)**: `4657`
- **SMTP**: `1025`
- **Web UI**: `4657` (same as HTTP API)

### CLI Options

You can override ports via CLI flags or environment variables:

```bash
# Using CLI flags
npx resend-box --http-port 3000 --smtp-port 2525

# Using environment variables
RESEND_SANDBOX_HTTP_PORT=3000 RESEND_SANDBOX_SMTP_PORT=2525 npx resend-box
```

### CLI Commands

```bash
# Start the sandbox (default command)
npx resend-box
# or
npx resend-box start

# Initialize RESEND_BASE_URL in your project
npx resend-box init
npx resend-box init --base-url http://127.0.0.1:3000

# Show help
npx resend-box --help
```

## Architecture

Resend Box consists of three main components:

1. **Resend API Mock** (`/emails`): Accepts POST requests matching the Resend API format and stores emails in memory
2. **SMTP Server** (port 1025): Accepts emails via SMTP protocol and normalizes them to the same format
3. **Web API & UI** (`/sandbox/*`): Provides REST endpoints for the UI and serves the React application

All emails are stored in an in-memory store that persists for the lifetime of the server process. The store normalizes emails from both sources (Resend API and SMTP) into a unified format.

### Data Flow

```
┌─────────────┐         ┌──────────────┐
│ Resend SDK  │────────▶│ Resend API   │
│             │         │ Mock (/emails)│
└─────────────┘         └───────┬───────┘
                                │
┌─────────────┐         ┌──────▼───────┐
│ SMTP Client │────────▶│ SMTP Server  │
│             │         │  (port 1025) │
└─────────────┘         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │ Email Store  │
                         │  (in-memory) │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │  Web API     │
                         │ (/sandbox/*) │
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │  React UI    │
                         │  (port 4657) │
                         └──────────────┘
```

## Web UI Features

The web UI provides:

- **Email List**: View all captured emails in reverse chronological order
- **Search**: Filter emails by subject, sender, or recipient
- **Source Filter**: Filter by `resend` or `smtp` source
- **Email Details**: View HTML, text, and raw MIME content
- **Copy to Clipboard**: Copy email addresses and subjects
- **Relative Timestamps**: See when emails were received (e.g., "2 minutes ago")
- **Auto-refresh**: Email list updates every 2 seconds
- **Delete**: Remove individual emails or clear all

## API Endpoints

### Resend API Mock

**POST** `/emails`
- Accepts Resend-compatible email payloads
- Returns: `{ id: string, created_at: string, to: string[], from: string }`

### Web API (for UI)

**GET** `/sandbox/emails`
- Returns: `{ emails: Email[] }` (newest first)

**GET** `/sandbox/emails/:id`
- Returns: `{ email: Email }` or `404 { error: string }`

**DELETE** `/sandbox/emails`
- Clears all emails
- Returns: `{ message: string }`

**DELETE** `/sandbox/emails/:id`
- Deletes a specific email
- Returns: `{ message: string }` or `404 { error: string }`

## Usage Examples

### Resend SDK

```typescript
import { Resend } from 'resend';

const resend = new Resend('re_test_...');

// After running 'resend-box init', this will use the local sandbox
const { data } = await resend.emails.send({
  from: 'you@example.com',
  to: 'user@gmail.com',
  subject: 'Hello',
  html: '<p>Hello world!</p>',
});

console.log('Email ID:', data.id);
```

### SMTP (Node.js with nodemailer)

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 1025,
  secure: false,
});

await transporter.sendMail({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Email',
  text: 'Hello from SMTP!',
  html: '<p>Hello from SMTP!</p>',
});
```

### SMTP (Python)

```python
import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Hello from Python!')
msg['Subject'] = 'Test Email'
msg['From'] = 'sender@example.com'
msg['To'] = 'recipient@example.com'

server = smtplib.SMTP('127.0.0.1', 1025)
server.send_message(msg)
server.quit()
```

### Direct API Calls

```bash
# Send email via Resend API mock
curl -X POST http://127.0.0.1:4657/emails \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "user@example.com",
    "subject": "Test Email",
    "html": "<p>Hello!</p>"
  }'

# List all emails
curl http://127.0.0.1:4657/sandbox/emails

# Get specific email
curl http://127.0.0.1:4657/sandbox/emails/{email-id}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## License

MIT

