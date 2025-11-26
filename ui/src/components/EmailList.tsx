import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Inbox, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { API_BADGE_CLASSES, SMTP_BADGE_CLASSES } from "@/lib/constants";

import type { Email } from "@/types";

interface EmailListProps {
  emails: Email[];
  loading?: boolean;
  onEmailClick: (email: Email) => void;
}

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(timestamp).toLocaleDateString();
};

export const EmailList = ({
  emails,
  loading,
  onEmailClick,
}: EmailListProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6 pt-0 xl:pt-6">
        <h1 className="text-3xl font-bold">Emails</h1>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && emails.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading...
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col -mt-10 items-center justify-center h-full text-center px-6">
            <div className="mb-6">
              <Inbox className="h-16 w-16 text-muted-foreground/40 mx-auto" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No emails yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Send your first email to your SMTP server or by using the Resend
              SDK. Check the Settings page for configuration details.
            </p>
            <Link to="/ui/settings">
              <Button variant="default" className="gap-2">
                <Settings className="h-4 w-4" />
                Go to Settings
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email) => (
                <TableRow
                  key={email.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onEmailClick(email)}
                >
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        email.source === "resend"
                          ? API_BADGE_CLASSES
                          : SMTP_BADGE_CLASSES
                      }
                    >
                      {email.source === "resend" ? "API" : "SMTP"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {email.to.join(", ")}
                  </TableCell>
                  <TableCell>{email.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(email.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
