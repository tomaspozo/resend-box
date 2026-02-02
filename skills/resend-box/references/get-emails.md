# Get Emails from Resend Box

Use this skill when you need to retrieve emails captured by the local Resend Box sandbox. This is useful for verifying that emails were sent correctly during development and testing.

## Prerequisites

Resend Box must be running locally. Default port is 4657.

## API Endpoints

### List All Emails

```
GET http://127.0.0.1:4657/sandbox/emails
```

Returns all captured emails in reverse chronological order (newest first).

### Filter by Recipient

```
GET http://127.0.0.1:4657/sandbox/emails?to=user@example.com
```

Returns only emails where the `to` field contains the specified address. The filter matches partially, so `?to=example.com` matches all emails to any `@example.com` address.

### Get Single Email by ID

```
GET http://127.0.0.1:4657/sandbox/emails/:id
```

Returns a specific email by its ID.

## Example: List All Emails

```bash
curl http://127.0.0.1:4657/sandbox/emails
```

Response:
```json
{
  "emails": [
    {
      "id": "abc123xyz",
      "source": "resend",
      "from": "noreply@myapp.com",
      "to": ["user@example.com"],
      "subject": "Welcome!",
      "html": "<h1>Welcome!</h1>",
      "text": "Welcome!",
      "createdAt": 1705312200000
    }
  ]
}
```

## Example: Filter by Recipient

```bash
# Get all emails sent to a specific address
curl "http://127.0.0.1:4657/sandbox/emails?to=user@example.com"

# Get all emails sent to any @example.com address
curl "http://127.0.0.1:4657/sandbox/emails?to=example.com"
```

## Example: Get Single Email

```bash
curl http://127.0.0.1:4657/sandbox/emails/abc123xyz
```

Response:
```json
{
  "email": {
    "id": "abc123xyz",
    "source": "resend",
    "from": "noreply@myapp.com",
    "to": ["user@example.com"],
    "subject": "Welcome!",
    "html": "<h1>Welcome!</h1>",
    "createdAt": 1705312200000
  }
}
```

## Email Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique email identifier |
| `source` | "resend" \| "smtp" | How the email was received |
| `from` | string | Sender address |
| `to` | string[] | Recipient addresses |
| `cc` | string[] | CC recipients (optional) |
| `bcc` | string[] | BCC recipients (optional) |
| `subject` | string | Email subject |
| `html` | string | HTML body (optional) |
| `text` | string | Plain text body (optional) |
| `createdAt` | number | Unix timestamp (ms) |
| `raw` | object | Original request data (optional) |

## Additional Operations

### Delete All Emails

```bash
curl -X DELETE http://127.0.0.1:4657/sandbox/emails
```

### Delete Single Email

```bash
curl -X DELETE http://127.0.0.1:4657/sandbox/emails/abc123xyz
```

## Using with jq for Parsing

```bash
# Get the subject of the most recent email
curl -s http://127.0.0.1:4657/sandbox/emails | jq '.emails[0].subject'

# Get all emails sent to a user and extract subjects
curl -s "http://127.0.0.1:4657/sandbox/emails?to=user@example.com" | jq '.emails[].subject'

# Count emails
curl -s http://127.0.0.1:4657/sandbox/emails | jq '.emails | length'

# Get the HTML content of the latest email
curl -s http://127.0.0.1:4657/sandbox/emails | jq -r '.emails[0].html'
```

## Notes

- Emails are stored in-memory only; they are lost when the server restarts
- The `to` filter is case-insensitive and matches partial addresses
- Empty response: `{"emails": []}` when no emails match
