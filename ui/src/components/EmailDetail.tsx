import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { API_BADGE_CLASSES, SMTP_BADGE_CLASSES } from "@/lib/constants";

import type { Email } from "@/types";

interface EmailDetailProps {
  email: Email | null;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Formats headers for display, converting objects and arrays to readable strings
 */
const formatHeaders = (
  headers: Record<string, unknown> | undefined
): string => {
  if (!headers) return "{}";

  const formatted: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === null || value === undefined) {
      formatted[key] = String(value);
    } else if (Array.isArray(value)) {
      formatted[key] = value.map((v) => formatValue(v)).join(", ");
    } else if (typeof value === "object") {
      // Handle objects - try to extract meaningful data
      formatted[key] = formatValue(value);
    } else {
      formatted[key] = String(value);
    }
  }

  return JSON.stringify(formatted, null, 2);
};

/**
 * Formats a single header value, handling objects and arrays
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((v) => formatValue(v)).join(", ");
  }

  if (typeof value === "object") {
    // Try to extract meaningful properties from common email header objects
    const obj = value as Record<string, unknown>;

    // Handle address objects (common in email headers)
    if (obj.address && typeof obj.address === "string") {
      const name = obj.name ? `${obj.name} <${obj.address}>` : obj.address;
      return name;
    }

    // Handle objects with value property (mailparser format)
    if (obj.value !== undefined) {
      if (Array.isArray(obj.value)) {
        return obj.value
          .map((v: unknown) => {
            if (typeof v === "object" && v !== null && "address" in v) {
              const addr = v as { address: string; name?: string };
              return addr.name
                ? `${addr.name} <${addr.address}>`
                : addr.address;
            }
            return formatValue(v);
          })
          .join(", ");
      }
      return formatValue(obj.value);
    }

    // Handle mailparser header objects that might have text property
    if (obj.text && typeof obj.text === "string") {
      return obj.text;
    }

    // Handle objects with html property
    if (obj.html && typeof obj.html === "string") {
      return obj.html;
    }

    // Try to extract all string properties and join them
    const stringProps: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") {
        stringProps.push(`${k}: ${v}`);
      } else if (typeof v === "object" && v !== null) {
        // Recursively format nested objects
        stringProps.push(`${k}: ${formatValue(v)}`);
      }
    }
    if (stringProps.length > 0) {
      return stringProps.join("; ");
    }

    // For other objects, try to stringify
    try {
      const stringified = JSON.stringify(value, null, 2);
      // If JSON.stringify returns something meaningful (not just {}), use it
      if (stringified && stringified !== "{}" && stringified !== "[]") {
        return stringified;
      }
    } catch {
      // Fall through to final return
    }

    // Last resort: try to find any meaningful string representation
    // Check if object has a toString method that's not the default
    if (value.toString && value.toString !== Object.prototype.toString) {
      const str = value.toString();
      if (str && str !== "[object Object]") {
        return str;
      }
    }
  }

  // Final fallback - but this should rarely be hit
  const str = String(value);
  return str === "[object Object]" ? JSON.stringify(value) : str;
};

/**
 * Processes HTML content to make all links open in a new tab
 * Adds target="_blank" and rel="noopener noreferrer" to all anchor tags
 * Also injects JavaScript to intercept clicks and ensure links open in new tabs
 */
const processHtmlForIframe = (html: string): string => {
  // Use DOMParser if available (browser environment)
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    // Check if HTML is a full document or just a fragment
    const isFullDocument = /^\s*<!DOCTYPE|^\s*<html/i.test(html);
    const doc = parser.parseFromString(html, "text/html");
    const links = doc.querySelectorAll("a");

    links.forEach((link) => {
      link.setAttribute("target", "_blank");
      // Preserve existing rel attributes and add noopener noreferrer
      const existingRel = link.getAttribute("rel") || "";
      const relParts = existingRel.split(/\s+/).filter(Boolean);
      if (!relParts.includes("noopener")) relParts.push("noopener");
      if (!relParts.includes("noreferrer")) relParts.push("noreferrer");
      link.setAttribute("rel", relParts.join(" "));
    });

    // Inject the click interceptor script
    const scriptElement = doc.createElement("script");
    scriptElement.textContent = `
      (function() {
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (link && link.href) {
            e.preventDefault();
            e.stopPropagation();
            window.open(link.href, '_blank', 'noopener,noreferrer');
            return false;
          }
        }, true);
      })();
    `;

    // Ensure we have a head element to inject the script
    let head = doc.head;
    if (!head) {
      head = doc.createElement("head");
      const htmlElement = doc.documentElement;
      const bodyElement = doc.body;
      if (htmlElement) {
        if (bodyElement) {
          htmlElement.insertBefore(head, bodyElement);
        } else {
          htmlElement.appendChild(head);
        }
      }
    }
    head.appendChild(scriptElement);

    // Return full document structure if original was a full document, otherwise just body content
    if (isFullDocument) {
      return doc.documentElement.outerHTML;
    }
    const body = doc.body;
    return body ? body.innerHTML : doc.documentElement.innerHTML;
  }

  // Fallback: regex-based approach for environments without DOMParser
  // Match <a> tags with or without existing attributes
  return html.replace(/<a\s+([^>]*?)>/gi, (_match, attributes: string) => {
    // Check if target already exists
    if (/\btarget\s*=/i.test(attributes)) {
      // Replace existing target attribute
      attributes = attributes.replace(
        /\btarget\s*=\s*["'][^"']*["']/gi,
        'target="_blank"'
      );
    } else {
      // Add target attribute
      attributes = `${attributes} target="_blank"`;
    }

    // Check if rel already exists
    if (/\brel\s*=/i.test(attributes)) {
      // Add noopener noreferrer to existing rel if not present
      if (!/\bnoopener\b/i.test(attributes)) {
        attributes = attributes.replace(
          /\brel\s*=\s*["']([^"']*)["']/gi,
          (_relMatch: string, relValue: string) =>
            `rel="${relValue} noopener noreferrer"`
        );
      }
    } else {
      // Add rel attribute
      attributes = `${attributes} rel="noopener noreferrer"`;
    }

    return `<a ${attributes}>`;
  });
};

export const EmailDetail = ({ email, onBack }: EmailDetailProps) => {
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

  const getContentForActiveTab = (): string | null => {
    switch (activeTab) {
      case "preview":
        return email.html || email.text || null;
      case "text":
        return email.text || null;
      case "html":
        return email.html || null;
      case "request":
        // Request tab has separate copy buttons, so main copy button is disabled
        return null;
      default:
        return null;
    }
  };

  const hasContentForActiveTab = (): boolean => {
    // Request tab has separate copy buttons, so main copy button is disabled
    if (activeTab === "request") {
      return false;
    }
    return getContentForActiveTab() !== null;
  };

  const isResend = email.source === "resend";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6 pt-0 xl:pt-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-lg inline-flex select-none items-center font-medium truncate bg-zinc-300/30 text-zinc-600 dark:bg-zinc-700/30 dark:text-zinc-400 border border-transparent mx-auto justify-center">
            <Mail className="size-7" />
          </div>
          <div className="flex-1">
            <div className="flex">
              <h1 className="text-xl font-bold">{email.to[0]}</h1>
            </div>
            <Badge
              variant="outline"
              className={isResend ? API_BADGE_CLASSES : SMTP_BADGE_CLASSES}
            >
              {isResend ? "API" : "SMTP"}
            </Badge>
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
          {/* <div>
            <div className="text-sm text-muted-foreground mb-1">TO</div>
            <div className="text-sm font-medium">{email.to.join(", ")}</div>
          </div> */}
          {/* <div>
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
          </div> */}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex-1 flex flex-col h-full">
        <div className="px-6 pt-6 flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="text">Plain Text</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="request">Request</TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab !== "request" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const content = getContentForActiveTab();
                if (content) {
                  handleCopy(content, "content");
                }
              }}
              disabled={!hasContentForActiveTab()}
              title={
                hasContentForActiveTab() ? "Copy content" : "No content to copy"
              }
            >
              {copiedId === "content" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <div className="flex-1 p-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full"
          >
            <TabsContent value="preview" className="mt-0 h-full">
              {email.html ? (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border h-full overflow-hidden">
                  <iframe
                    srcDoc={processHtmlForIframe(email.html)}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
                    title="Email preview"
                    style={{
                      display: "block",
                    }}
                  />
                </div>
              ) : email.text ? (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 h-full overflow-auto">
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
            <TabsContent value="request" className="mt-0 h-full">
              <div className="space-y-4">
                {email.source === "resend" && email.raw?.request ? (
                  <>
                    {/* Resend API Request Payload */}
                    {email.raw.request.payload && (
                      <div className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Request Payload</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const payload = JSON.stringify(
                                email.raw?.request?.payload,
                                null,
                                2
                              );
                              if (payload) {
                                handleCopy(payload, "payload");
                              }
                            }}
                            disabled={!email.raw?.request?.payload}
                            title="Copy payload"
                          >
                            {copiedId === "payload" ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                          {JSON.stringify(email.raw.request.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                    {/* Resend API Request Headers */}
                    {email.raw.request.headers && (
                      <div className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Request Headers</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const headers = formatHeaders(
                                email.raw?.request?.headers
                              );
                              if (headers) {
                                handleCopy(headers, "request-headers");
                              }
                            }}
                            disabled={!email.raw?.request?.headers}
                            title="Copy headers"
                          >
                            {copiedId === "request-headers" ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                          {formatHeaders(email.raw.request.headers)}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* SMTP Email Headers */}
                    {email.raw?.headers && (
                      <div className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Email Headers</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const headers = formatHeaders(email.raw?.headers);
                              if (headers) {
                                handleCopy(headers, "headers");
                              }
                            }}
                            disabled={!email.raw?.headers}
                            title="Copy headers"
                          >
                            {copiedId === "headers" ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                          {formatHeaders(email.raw.headers)}
                        </pre>
                      </div>
                    )}
                    {/* SMTP Raw MIME */}
                    {email.raw?.mime && (
                      <div className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Raw MIME</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (email.raw?.mime) {
                                handleCopy(email.raw.mime, "mime");
                              }
                            }}
                            disabled={!email.raw?.mime}
                            title="Copy MIME"
                          >
                            {copiedId === "mime" ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                          {email.raw.mime}
                        </pre>
                      </div>
                    )}
                  </>
                )}
                {email.source === "resend" && !email.raw?.request && (
                  <div className="text-muted-foreground p-4 border rounded">
                    No request data available
                  </div>
                )}
                {email.source === "smtp" &&
                  !email.raw?.headers &&
                  !email.raw?.mime && (
                    <div className="text-muted-foreground p-4 border rounded">
                      No raw data available
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
