# Development Guide

This guide explains how to develop, test, and use Resend Box locally without installing the published package.

## Prerequisites

- Node.js 18+ and npm
- Basic familiarity with TypeScript and React

## Initial Setup

1. **Clone and install dependencies:**

```bash
# Install all dependencies (root + UI workspace)
npm install
```

## Development Workflow

### Running the Sandbox in Development Mode

The project supports two development modes:

#### Option 1: Backend Only (Recommended for API/SMTP development)

Run the backend server with hot reload:

```bash
npm run dev
```

This starts:

- Resend API mock at `http://127.0.0.1:4657/emails`
- SMTP server at `127.0.0.1:1025`
- Web API at `http://127.0.0.1:4657/sandbox/*`

**Note:** The UI won't be available in this mode unless you've built it first (see below).

#### Option 2: Full Stack Development

Run both backend and UI in development mode with a single command:

```bash
npm run dev
```

This starts:

- Backend at `http://127.0.0.1:4657`
- UI dev server at `http://127.0.0.1:5173` (or another port if 5173 is taken)

The UI dev server will proxy API requests to the backend automatically.

You can also run them separately if needed:

```bash
npm run dev:server  # Backend only
npm run dev:ui      # UI only
```

### Building for Production

Build both the backend and UI:

```bash
npm run build
```

This compiles:

- TypeScript backend code to `dist/`
- React UI to `dist/ui/`

After building, you can run the production version:

```bash
npm start         # Start the sandbox
npm run init      # Configure your project
```

Or use the CLI directly:

```bash
node dist/cli.js start
```

## Testing

### Run Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Type Checking

```bash
npm run typecheck
```

## Using the Sandbox Locally

### Method 1: Direct Node Execution

After building, run the CLI directly:

```bash
# Start the sandbox
node dist/cli.js start

# Or with custom ports
node dist/cli.js start --http-port 3000 --smtp-port 2525

# Initialize a project
node dist/cli.js init
```

### Method 2: Using npm scripts

```bash
# Build first
npm run build

# Then start
npm start

# Initialize a project
npm run init

# Or with environment variables
RESENDBOX_HTTP_PORT=3000 npm start
```

### Method 3: Development Mode (tsx)

For quick testing without building:

```bash
# Run directly using npx (uses tsx from devDependencies)
npx tsx server/cli.ts start
```

## Configuring Your Project to Use Local Sandbox

### Option 1: Using the init command

From your project directory (not the sandbox directory):

```bash
# If running from built version
node /path/to/resend-box/dist/cli.js init

# If using tsx
tsx /path/to/resend-box/server/cli.ts init
```

This will add `RESEND_BASE_URL=http://127.0.0.1:4657` to your `.env.local` or `.env` file.

### Option 2: Manual Configuration

Add to your project's `.env.local` or `.env`:

```env
RESEND_BASE_URL=http://127.0.0.1:4657
```

If you're using custom ports:

```env
RESEND_BASE_URL=http://127.0.0.1:3000
```

## Project Structure

```
resend-box/
├── server/              # Backend TypeScript source
│   ├── cli.ts          # CLI entry point
│   ├── resend-api.ts   # Resend API mock
│   ├── smtp-server.ts # SMTP server
│   ├── web-api.ts      # Web API for UI
│   ├── store.ts        # Email store
│   └── types.ts        # TypeScript types
├── ui/                  # React UI application (workspace)
│   └── src/
│       ├── App.tsx     # Main UI component
│       ├── api.ts      # API client
│       └── components/ # UI components
├── test/                # Integration tests
├── dist/                 # Compiled output (after build)
└── package.json         # Workspace root
```

## Development Tips

### Hot Reload

- Backend: `npm run dev` uses `tsx watch` for automatic reloading
- UI: `npm run dev:ui` uses Vite's HMR for instant updates

### Debugging

1. **Backend debugging:** Use Node.js debugger or add `console.log` statements
2. **UI debugging:** Use browser DevTools (React DevTools recommended)
3. **SMTP testing:** Use tools like `telnet 127.0.0.1 1025` or email clients

### Testing SMTP Locally

```bash
# Using telnet (if available)
telnet 127.0.0.1 1025

# Then send SMTP commands manually:
EHLO 127.0.0.1
MAIL FROM:<test@example.com>
RCPT TO:<user@example.com>
DATA
Subject: Test
Hello World
.
QUIT
```

### Common Issues

**Port already in use:**

```bash
# Use different ports
node dist/cli.js start --http-port 3000 --smtp-port 2525
```

**UI not loading:**

- Make sure you've built the UI: `npm run build:ui`
- Or run UI in dev mode: `npm run dev:ui`

**TypeScript errors:**

- Run `npm run typecheck` to see all type errors
- Make sure all dependencies are installed

## Making Changes

### Backend Changes

1. Edit files in `server/`
2. If using `npm run dev`, changes auto-reload
3. If using built version, run `npm run build` after changes

### UI Changes

1. Edit files in `ui/src/`
2. If using `npm run dev:ui`, changes appear instantly
3. If using built version, run `npm run build:ui` after changes

### Testing Changes

After making changes:

1. Run tests: `npm test`
2. Type check: `npm run typecheck`
3. Test manually by sending emails via Resend SDK or SMTP

## Publishing (For Maintainers)

When ready to publish a new version:

```bash
# Build everything
npm run build

# Run tests
npm test

# Update version in package.json
npm version patch|minor|major

# Publish
npm publish
```

## Environment Variables

See `.env.example` for available environment variables.

Key variables:

- `RESEND_BASE_URL`: Used by projects to point Resend SDK to sandbox
- `RESENDBOX_HTTP_PORT`: Override HTTP port (default: 4657)
- `RESENDBOX_SMTP_PORT`: Override SMTP port (default: 1025)
