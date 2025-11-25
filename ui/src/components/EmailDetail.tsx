import { useState } from "react";
import {
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  Code,
  MoreHorizontal,
  Mail,
  Send,
  CheckCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import type { Email } from "../types";

interface EmailDetailProps {
  email: Email | null;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${month} ${day}, ${displayHours}:${displayMinutes} ${ampm}`;
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const EmailDetail = ({ email, onBack, onDelete }: EmailDetailProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("preview");

  if (!email) return null;

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm("Are you sure you want to delete this email?")) {
      onDelete(email.id);
      onBack();
    }
  };

  const isResend = email.source === "resend";

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Code className="h-4 w-4" />
              API
            </Button>
            <Button variant="outline" size="sm">
              A
            </Button>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg border-2 border-green-600 dark:border-green-500 bg-green-600/10 dark:bg-green-500/10 flex items-center justify-center">
            {isResend ? (
              <Mail className="h-8 w-8 text-green-600 dark:text-green-500" />
            ) : (
              <Send className="h-8 w-8 text-green-600 dark:text-green-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{email.to[0]}</h1>
              <Badge
                variant="outline"
                className={
                  isResend
                    ? "backdrop-blur-sm bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 dark:hover:bg-blue-500/30"
                    : "backdrop-blur-sm bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 dark:hover:bg-purple-500/30"
                }
              >
                {isResend ? "API" : "SMTP"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="border-b p-6 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">FROM</div>
            <div className="text-sm font-medium">{email.from}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">SUBJECT</div>
            <div className="text-sm font-medium">{email.subject}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">TO</div>
            <div className="text-sm font-medium">{email.to.join(", ")}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">ID</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{email.id}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleCopy(email.id, "id")}
                title="Copy ID"
              >
                {copiedId === "id" ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Events */}
      <div className="border-b p-6 bg-muted/30 relative">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0",
          }}
        />
        <div className="relative">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            EMAIL EVENTS
          </h2>
          <div className="flex items-center justify-center gap-8">
            {/* Sent Event */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                <Send className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Sent</div>
                <div className="text-sm font-medium">
                  {formatDateTime(email.createdAt)}
                </div>
              </div>
            </div>

            {/* Connection Line */}
            <div className="flex-1 max-w-90 h-0.5 border-t-2 border-dashed border-border"></div>

            {/* Delivered Event */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-center">
                <div className="text-sm text-green-600 dark:text-green-500 font-medium">
                  Delivered
                </div>
                <div className="text-sm font-medium">
                  {formatDateTime(email.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-6 flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="text">Plain Text</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              handleCopy(email.html || email.text || "", "content")
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full"
          >
            <TabsContent value="preview" className="mt-0 h-full">
              {email.html ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border h-full overflow-hidden">
                  <iframe
                    srcDoc={email.html}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                    title="Email preview"
                    style={{
                      display: "block",
                    }}
                  />
                </div>
              ) : email.text ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border p-6 h-full overflow-auto">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {email.text}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground p-4 border rounded">
                  No content available
                </div>
              )}
            </TabsContent>
            <TabsContent value="text" className="mt-0 h-full">
              {email.text ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border p-6 h-full overflow-auto">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {email.text}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground p-4 border rounded">
                  No text content
                </div>
              )}
            </TabsContent>
            <TabsContent value="html" className="mt-0 h-full">
              {email.html ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border p-6 h-full overflow-auto">
                  <pre className="whitespace-pre-wrap font-mono text-xs overflow-auto">
                    {email.html}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground p-4 border rounded">
                  No HTML content
                </div>
              )}
            </TabsContent>
            <TabsContent value="insights" className="mt-0 h-full">
              <div className="space-y-4">
                <div className="border rounded p-4">
                  <h3 className="font-semibold mb-2">Email Headers</h3>
                  <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                    {JSON.stringify(email.raw?.headers || {}, null, 2)}
                  </pre>
                </div>
                {email.raw?.mime && (
                  <div className="border rounded p-4">
                    <h3 className="font-semibold mb-2">Raw MIME</h3>
                    <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                      {email.raw.mime}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
