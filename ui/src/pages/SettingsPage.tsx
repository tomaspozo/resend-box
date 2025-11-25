import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { CodeBlock } from "../components/CodeBlock";
import { fetchConfig, type ServerConfig } from "../api";

export const SettingsPage = () => {
  const [config, setConfig] = useState<ServerConfig | null>(null);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch((error) => {
        console.error("Failed to fetch config:", error);
        // Fallback to defaults if fetch fails
        setConfig({ httpPort: 4657, smtpPort: 1025 });
      });
  }, []);

  const httpPort = config?.httpPort ?? 4657;
  const smtpPort = config?.smtpPort ?? 1025;

  const envCode = `RESEND_API_KEY=re_eieodijdoeijdoidejiedjo

# This value is compatible for Edge Functions
RESEND_BASE_URL=http://host.docker.internal:${httpPort}

SMTP_HOST=host.docker.internal
SMTP_PORT=${smtpPort}
SMTP_USER=admin
SMTP_PASSWORD=admin
SMTP_ADMIN_EMAIL="no-reply@sandbox.local"
SMTP_SENDER_NAME="Sandbox"`;

  const supabaseConfigCode = `[auth.email.smtp]
enabled = true
host = "env(SMTP_HOST)"
port = "env(SMTP_PORT)"
user = "env(SMTP_USER)"
pass = "env(SMTP_PASSWORD)"
admin_email = "env(SMTP_ADMIN_EMAIL)"
sender_name = "env(SMTP_SENDER_NAME)"`;

  return (
    <div className="flex flex-col space-y-6 pb-6">
      {/* Status Banner */}
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="font-medium text-green-900 dark:text-green-100">
                Resend Box is running
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your local email sandbox is ready. Configure your environment to
                start sending emails.
              </p>
              {config && (
                <div className="mt-2 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-green-800 dark:text-green-200 font-medium">
                        HTTP API & UI:
                      </span>{" "}
                      <code className="text-xs bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded text-green-900 dark:text-green-100">
                        http://127.0.0.1:{httpPort}
                      </code>
                    </div>
                    <div>
                      <span className="text-green-800 dark:text-green-200 font-medium">
                        SMTP Server:
                      </span>{" "}
                      <code className="text-xs bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded text-green-900 dark:text-green-100">
                        127.0.0.1:{smtpPort}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <CardDescription>
            Run this command in your project directory to automatically
            configure your environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code="npx resend-box init" />
          <p className="text-sm text-muted-foreground mt-4">
            This command will automatically add or update{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              RESEND_BASE_URL
            </code>{" "}
            in your{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              .env.local
            </code>{" "}
            or{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env</code>{" "}
            file.
          </p>
        </CardContent>
      </Card>

      {/* Manual Environment Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Environment Setup</CardTitle>
          <CardDescription>
            If you prefer to configure manually, add these variables to your{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env</code>{" "}
            file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={envCode} language="bash" title=".env" />
          <p className="text-sm text-muted-foreground mt-4">
            This setup is for Supabase Local dev, and sending emails with the
            Resend SDK from Edge Functions.
          </p>
        </CardContent>
      </Card>

      {/* Supabase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Supabase Configuration</CardTitle>
          <CardDescription>
            Update your{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              config.toml
            </code>{" "}
            file with these SMTP settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={supabaseConfigCode}
            language="toml"
            title="config.toml"
          />
          <p className="text-sm text-muted-foreground mt-6 mb-4">
            Make sure to restart your Supabase local dev server after updating
            the{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              config.toml
            </code>{" "}
            file.
          </p>
          <CodeBlock
            code="npx supabase stop && npx supabase start"
            language="bash"
            title="Restart Supabase"
          />
        </CardContent>
      </Card>

      {/* What's Next */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
          <CardDescription>
            Once configured, you can start sending test emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Send emails using the Resend SDK from your Edge Functions</p>
            <p>
              • Test Supabase authentication emails (password reset, email
              verification, etc.)
            </p>
            <p>• All emails will appear in the Emails tab for inspection</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
