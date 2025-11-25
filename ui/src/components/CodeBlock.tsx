import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const CodeBlock = ({ code, language, title, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn("relative rounded-lg border bg-muted/50 overflow-hidden", className)}>
      {title && (
        <div className="px-4 py-2 border-b bg-muted/30 text-sm font-medium text-foreground">
          {title}
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto">
          <code className={cn("text-sm font-mono", language && `language-${language}`)}>
            {code}
          </code>
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

