# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resend Box is a local email sandbox that mocks the Resend API and runs an SMTP server, with a React web UI for inspecting captured emails. All emails are stored in-memory for the lifetime of the server process.

## Commands

### Development
```bash
npm install              # Install all dependencies (root + UI workspace)
npm run dev              # Run both backend (tsx watch) and UI (Vite) with hot reload
npm run dev:server       # Backend only with hot reload
npm run dev:ui           # UI only with Vite HMR
```

### Build & Run
```bash
npm run build            # Build both backend (tsc) and UI (Vite)
npm start                # Start production server (requires build first)
npx tsx server/cli.ts start  # Run directly without building
```

### Testing & Quality
```bash
npm test                 # Run tests once (Vitest)
npm run test:watch       # Run tests in watch mode
npm run typecheck        # TypeScript type checking
npm run format           # Format code with Prettier
npm run format:check     # Check formatting
```

## Architecture

### Monorepo Structure
This is an npm workspaces monorepo with the UI as a workspace (`ui/`).

### Backend (`server/`)
- **cli.ts** - Entry point, Commander CLI with `start` and `init` commands
- **resend-api.ts** - Express router mocking the Resend `POST /emails` endpoint
- **smtp-server.ts** - SMTP server using `smtp-server` package
- **web-api.ts** - Express router for UI endpoints (`/sandbox/*`)
- **store.ts** - In-memory email storage with CRUD operations
- **init.ts** - Project initialization (configures .env files and Supabase config.toml)
- **types.ts** - Shared TypeScript types

### Frontend (`ui/`)
- React 18 + Vite + Tailwind CSS v4
- React Router for navigation
- Pages in `ui/src/pages/`, components in `ui/src/components/`
- API client in `ui/src/api.ts`

### Data Flow
1. Emails arrive via Resend API mock (`POST /emails`) or SMTP server (port 1025)
2. Both sources normalize emails and store them in the shared in-memory store
3. Web API serves stored emails to the React UI
4. UI polls for updates and displays email content (HTML, text, raw)

### Default Ports
- HTTP (API + UI): 4657
- SMTP: 1025

Ports configurable via `--http-port`/`--smtp-port` flags or `RESENDBOX_HTTP_PORT`/`RESENDBOX_SMTP_PORT` env vars.

## Testing

### Automated Tests
Integration tests are in `test/`. Tests use Vitest and test the actual servers by making HTTP/SMTP requests.

### Manual Local Testing
With the server running (`npm run dev`), send test emails:

```bash
# Via Resend API mock
curl -X POST http://127.0.0.1:4657/emails \
  -H "Content-Type: application/json" \
  -d '{"from": "test@example.com", "to": "user@example.com", "subject": "Test", "html": "<p>Hello</p>"}'

# Via SMTP (telnet)
telnet 127.0.0.1 1025
# Then: EHLO localhost, MAIL FROM:<test@example.com>, RCPT TO:<user@example.com>, DATA, etc.
```

View captured emails at http://127.0.0.1:4657
