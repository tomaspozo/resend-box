# Send Email via Resend Box

Use this skill when you need to send a test email through the local Resend Box sandbox. This is useful for testing email functionality during development without sending real emails.

## Prerequisites

Resend Box must be running locally. Default port is 4657.

## API Endpoint

```
POST http://127.0.0.1:4657/emails
Content-Type: application/json
```

## Request Format

```json
{
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<p>HTML content</p>",
  "text": "Plain text content (optional)"
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `from` | string | Sender email address |
| `to` | string or string[] | Recipient email address(es) |
| `subject` | string | Email subject line |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `html` | string | HTML email body |
| `text` | string | Plain text email body |
| `cc` | string or string[] | CC recipients |
| `bcc` | string or string[] | BCC recipients |
| `replyTo` | string or string[] | Reply-to address(es) |

At least one of `html` or `text` should be provided.

## Example: Send with curl

```bash
curl -X POST http://127.0.0.1:4657/emails \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@myapp.com",
    "to": "user@example.com",
    "subject": "Welcome to MyApp",
    "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>"
  }'
```

## Example: Send to Multiple Recipients

```bash
curl -X POST http://127.0.0.1:4657/emails \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@myapp.com",
    "to": ["user1@example.com", "user2@example.com"],
    "cc": "manager@example.com",
    "subject": "Team Update",
    "text": "Here is the weekly update..."
  }'
```

## Response

Success (200):
```json
{
  "id": "abc123xyz",
  "created_at": "2024-01-15T10:30:00.000Z",
  "to": ["user@example.com"],
  "from": "noreply@myapp.com"
}
```

Error (400):
```json
{
  "message": "Missing required fields: from, to, subject"
}
```

## Viewing Sent Emails

After sending, emails can be viewed at:
- **Web UI**: http://127.0.0.1:4657
- **API**: `GET http://127.0.0.1:4657/sandbox/emails`

## Notes

- Emails are stored in-memory only; they are lost when the server restarts
- No actual emails are sent to real recipients
- The API mimics the Resend API format for drop-in compatibility
