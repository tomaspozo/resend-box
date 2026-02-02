# Resend Box Setup Guide

Configure your project to send emails to the local Resend Box sandbox instead of the production Resend API.

## Quick Setup

Run the init command in your project directory:

```bash
npx resend-box init
```

This automatically configures your `.env` or `.env.local` file with the correct environment variables.

## Manual Setup

### Environment Variables

Add these to your `.env` or `.env.local` file:

```bash
# Point Resend SDK to local sandbox
RESEND_BASE_URL=http://127.0.0.1:4657

# API key (any value works - the sandbox accepts all keys)
RESEND_API_KEY=re_your_api_key_here
```

### For Supabase Projects

If running inside Docker (e.g., Supabase local development), use `host.docker.internal` to reach the host machine:

```bash
RESEND_BASE_URL=http://host.docker.internal:4657
```

For SMTP configuration in `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "env(SMTP_HOST)"
port = "env(SMTP_PORT)"
user = "env(SMTP_USER)"
pass = "env(SMTP_PASSWORD)"
admin_email = "env(SMTP_ADMIN_EMAIL)"
sender_name = "env(SMTP_SENDER_NAME)"
```

With these environment variables:

```bash
SMTP_HOST=host.docker.internal
SMTP_PORT=1025
SMTP_USER=admin
SMTP_PASSWORD=admin
SMTP_ADMIN_EMAIL="no-reply@sandbox.local"
SMTP_SENDER_NAME="Sandbox"
```

## Using with the Resend SDK

### Node.js / TypeScript

```typescript
import { Resend } from 'resend'

// The SDK automatically uses RESEND_BASE_URL if set
const resend = new Resend(process.env.RESEND_API_KEY)

// Or explicitly configure the base URL
const resend = new Resend(process.env.RESEND_API_KEY, {
  baseUrl: process.env.RESEND_BASE_URL // http://127.0.0.1:4657
})

// Send email as usual - it goes to the local sandbox
await resend.emails.send({
  from: 'noreply@myapp.com',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Hello!</h1>'
})
```

### Python

```python
import resend
import os

resend.api_key = os.environ["RESEND_API_KEY"]
# Set base URL for local development
resend.base_url = os.environ.get("RESEND_BASE_URL", "https://api.resend.com")

resend.Emails.send({
    "from": "noreply@myapp.com",
    "to": "user@example.com",
    "subject": "Welcome!",
    "html": "<h1>Hello!</h1>"
})
```

## Using with SMTP

Configure your SMTP client to connect to:

- **Host**: `127.0.0.1` (or `host.docker.internal` from Docker)
- **Port**: `1025`
- **Authentication**: Not required (any credentials accepted)
- **TLS/SSL**: Not required

### Node.js with Nodemailer

```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 1025,
  secure: false,
})

await transporter.sendMail({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Email',
  html: '<p>Hello from SMTP!</p>'
})
```

## Verifying Setup

1. Start Resend Box:
   ```bash
   npx resend-box start
   ```

2. Send a test email from your application

3. Check the email was captured:
   ```bash
   curl http://127.0.0.1:4657/sandbox/emails
   ```

4. Or open http://127.0.0.1:4657 in your browser

## Custom Ports

Use environment variables or CLI flags to change ports:

```bash
# Environment variables
RESENDBOX_HTTP_PORT=8080 RESENDBOX_SMTP_PORT=2525 npx resend-box start

# CLI flags
npx resend-box start --http-port 8080 --smtp-port 2525
```

Update `RESEND_BASE_URL` accordingly:

```bash
RESEND_BASE_URL=http://127.0.0.1:8080
```

## Troubleshooting

### Emails not appearing

1. Verify Resend Box is running: `curl http://127.0.0.1:4657/sandbox/config`
2. Check `RESEND_BASE_URL` is set correctly in your app
3. Ensure you're not accidentally using the production Resend API

### Connection refused

- Check if the port is in use: `lsof -i :4657`
- Try a different port with `--http-port`

### Docker/Supabase can't connect

- Use `host.docker.internal` instead of `127.0.0.1` or `localhost`
- Ensure Docker has access to host networking
