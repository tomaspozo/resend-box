#!/usr/bin/env node

import { Command } from 'commander';
import { createStore } from './store.js';
import { createResendApiServer } from './resend-api.js';
import { createSmtpServer } from './smtp-server.js';
import { createWebApiServer } from './web-api.js';
import { initCommand } from './init.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validates and parses a port number
 */
const parsePort = (value: string, envVar?: string, defaultPort: number = 4657): number => {
  const port = envVar ? parseInt(envVar, 10) : parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}. Must be a number between 1 and 65535.`);
  }
  return port;
};

const program = new Command();

program
  .name('resend-box')
  .description('Local Resend API mock and SMTP server with web UI for email testing')
  .version('0.1.0')
  .addHelpText('after', `
Examples:
  $ resend-box                    Start the sandbox (default)
  $ resend-box start              Start the sandbox
  $ resend-box init               Configure RESEND_BASE_URL in your project
  $ resend-box --http-port 3000   Start with custom HTTP port
  $ resend-box --smtp-port 2525   Start with custom SMTP port

Environment Variables:
  RESEND_SANDBOX_HTTP_PORT  Override HTTP port (default: 4657)
  RESEND_SANDBOX_SMTP_PORT   Override SMTP port (default: 1025)
  `);

program
  .command('init')
  .description('Initialize RESEND_BASE_URL in your .env.local or .env file')
  .option('--base-url <url>', 'Custom base URL for Resend API', 'http://localhost:4657')
  .addHelpText('after', `
This command will:
  • Check for .env.local or .env in the current directory
  • Add or update RESEND_BASE_URL to point to the local sandbox
  • Allow your Resend SDK to automatically use the sandbox

Example:
  $ resend-box init
  $ resend-box init --base-url http://localhost:3000
  `)
  .action(async (options) => {
    try {
      await initCommand(options.baseUrl);
    } catch (error) {
      console.error('❌ Failed to initialize:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the Resend sandbox server (HTTP API, SMTP, and Web UI)')
  .option('--http-port <port>', 'HTTP port for API and UI', process.env.RESEND_SANDBOX_HTTP_PORT || '4657')
  .option('--smtp-port <port>', 'SMTP port', process.env.RESEND_SANDBOX_SMTP_PORT || '1025')
  .addHelpText('after', `
The sandbox provides:
  • Resend API mock at http://localhost:<http-port>/emails
  • Web UI at http://localhost:<http-port>
  • SMTP server at localhost:<smtp-port>

Ports can be set via CLI flags or environment variables:
  RESEND_SANDBOX_HTTP_PORT  (default: 4657)
  RESEND_SANDBOX_SMTP_PORT  (default: 1025)
  `)
  .action(async (options) => {
    try {
      const httpPort = parsePort(
        options.httpPort,
        process.env.RESEND_SANDBOX_HTTP_PORT,
        4657
      );
      const smtpPort = parsePort(
        options.smtpPort,
        process.env.RESEND_SANDBOX_SMTP_PORT,
        1025
      );

      // Add global error handlers FIRST to prevent crashes
      process.on('uncaughtException', (error: Error) => {
        console.error('❌ Uncaught Exception:', error.message);
        console.error(error.stack);
        // Log but don't exit - keep server running for sandbox
      });

      process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
        console.error('❌ Unhandled Rejection at:', promise);
        console.error('Reason:', reason);
        // Log but don't exit - keep server running for sandbox
      });

      // Create the email store
      const store = createStore();

      // Create and mount the Resend API server
      const resendApi = createResendApiServer(store, httpPort);

      // Create and mount the Web API server
      const webApi = createWebApiServer(store);

      // Combine both APIs into one Express app
      const app = express();
      app.use(resendApi);
      app.use(webApi);

      // Serve static UI files in production
      const uiPath = path.join(__dirname, '../dist/ui');
      const uiExists = existsSync(uiPath);
      
      if (uiExists) {
        app.use(express.static(uiPath));

        // Fallback to index.html for client-side routing
        app.get('*', (req, res) => {
          // Only serve index.html for non-API routes
          if (!req.path.startsWith('/sandbox') && !req.path.startsWith('/emails')) {
            res.sendFile(path.join(uiPath, 'index.html'));
          } else {
            res.status(404).json({ error: 'Not found' });
          }
        });
      } else {
        // UI not built yet - show helpful message
        app.get('/', (req, res) => {
          res.send(`
            <html>
              <head><title>Resend Box</title></head>
              <body style="font-family: sans-serif; padding: 2rem;">
                <h1>Resend Box</h1>
                <p>The web UI is not built yet. Run <code>npm run build</code> to build it.</p>
                <p>API endpoints are still available:</p>
                <ul>
                  <li><a href="/emails">POST /emails</a> - Resend API mock</li>
                  <li><a href="/sandbox/emails">GET /sandbox/emails</a> - List emails</li>
                </ul>
              </body>
            </html>
          `);
        });
      }

      // Start HTTP server
      const server = app.listen(httpPort, () => {
        console.log('\n🚀 Resend Box is running!\n');
        console.log(`📧 Resend API: http://localhost:${httpPort}/emails`);
        if (uiExists) {
          console.log(`🌐 Web UI:     http://localhost:${httpPort}`);
        } else {
          console.log(`🌐 Web UI:     (not built - run 'npm run build' to build it)`);
        }
        console.log(`📬 SMTP:       localhost:${smtpPort}`);
        console.log(`\n💡 Tip: Run 'resend-box init' to configure your project\n`);
      });

      // Handle HTTP server errors
      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${httpPort} is already in use. Try a different port with --http-port`);
        } else {
          console.error('❌ HTTP server error:', error.message);
        }
        // Only exit on critical errors like port already in use
        if (error.code === 'EADDRINUSE') {
          process.exit(1);
        }
      });

      // Handle HTTP server client errors (don't crash on client errors)
      server.on('clientError', (error: NodeJS.ErrnoException, socket) => {
        console.error('❌ HTTP client error:', error.message);
        // End the connection gracefully
        if (socket.writable) {
          socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        }
      });

      // Start SMTP server
      const smtpServer = createSmtpServer(store, smtpPort);
      
      // Handle graceful shutdown
      const shutdown = () => {
        console.log('\n\n👋 Shutting down Resend Box...');
        server.close(() => {
          if (typeof smtpServer.close === 'function') {
            smtpServer.close(() => {
              console.log('✅ Shutdown complete');
              process.exit(0);
            });
          } else {
            console.log('✅ Shutdown complete');
            process.exit(0);
          }
        });
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (error) {
      console.error('❌ Failed to start Resend Box:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse arguments - if no command, default to 'start'
const args = process.argv.slice(2);
if (args.length === 0) {
  program.parse(['start'], { from: 'node' });
} else if (args[0] === 'init' || args[0] === 'start' || args[0].startsWith('-')) {
  program.parse();
} else {
  // Unknown command, treat as start with flags
  program.parse(['start', ...args], { from: 'node' });
}

