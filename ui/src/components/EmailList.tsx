import { Code, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Mail, Send } from 'lucide-react';
import type { Email } from '../types';

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

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return new Date(timestamp).toLocaleDateString();
};

export const EmailList = ({ emails, loading, onEmailClick }: EmailListProps) => {

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <h1 className="text-3xl font-bold">Emails</h1>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && emails.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">No emails yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>To</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="w-12"></TableHead>
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
                    {email.source === 'resend' ? (
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                    ) : (
                      <Send className="h-4 w-4 text-purple-600 dark:text-purple-500" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{email.to.join(', ')}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        email.source === 'resend'
                          ? 'backdrop-blur-sm bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 dark:hover:bg-blue-500/30'
                          : 'backdrop-blur-sm bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 dark:hover:bg-purple-500/30'
                      }
                    >
                      {email.source === 'resend' ? 'API' : 'SMTP'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="backdrop-blur-sm bg-green-500/10 dark:bg-green-500/20 border-green-500/30 dark:border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/20 dark:hover:bg-green-500/30"
                    >
                      Delivered
                    </Badge>
                  </TableCell>
                  <TableCell>{email.subject}</TableCell>
                  <TableCell className="text-muted-foreground">{formatRelativeTime(email.createdAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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

