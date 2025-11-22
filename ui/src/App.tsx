import { useState, useEffect } from 'react';
import { Mail, Trash2, RefreshCw, X, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { fetchEmails, fetchEmail, deleteEmail, clearAllEmails } from './api';
import type { Email } from './types';

/**
 * Formats a timestamp as a relative time (e.g., "2 minutes ago")
 */
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

/**
 * Copies text to clipboard
 */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'resend' | 'smtp'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadEmails = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await fetchEmails();
      setEmails(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load emails';
      setError(message);
      console.error('Failed to load emails:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEmails();
    // Poll for new emails every 2 seconds
    const interval = setInterval(() => loadEmails(false), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectEmail = async (id: string) => {
    try {
      setError(null);
      const email = await fetchEmail(id);
      setSelectedEmail(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load email';
      setError(message);
      console.error('Failed to load email:', err);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      setError(null);
      await deleteEmail(id);
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
      await loadEmails(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete email';
      setError(message);
      console.error('Failed to delete email:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all emails?')) return;
    try {
      setError(null);
      await clearAllEmails();
      setSelectedEmail(null);
      await loadEmails(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear emails';
      setError(message);
      console.error('Failed to clear emails:', err);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredEmails = emails.filter((email) => {
    // Filter by source
    if (sourceFilter !== 'all' && email.source !== sourceFilter) {
      return false;
    }

    // Filter by search query
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.to.some((to) => to.toLowerCase().includes(query)) ||
      email.cc?.some((cc) => cc.toLowerCase().includes(query)) ||
      email.bcc?.some((bcc) => bcc.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-96 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Resend Sandbox
            </h1>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto h-6 w-6"
                onClick={() => setError(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => loadEmails(true)}
              title="Refresh"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="icon" variant="destructive" onClick={handleClearAll} title="Clear all">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={sourceFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setSourceFilter('all')}
              className="flex-1"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={sourceFilter === 'resend' ? 'default' : 'outline'}
              onClick={() => setSourceFilter('resend')}
              className="flex-1"
            >
              Resend
            </Button>
            <Button
              size="sm"
              variant={sourceFilter === 'smtp' ? 'default' : 'outline'}
              onClick={() => setSourceFilter('smtp')}
              className="flex-1"
            >
              SMTP
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredEmails.length} of {emails.length} email{emails.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && emails.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No emails match your search' : 'No emails yet'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => handleSelectEmail(email.id)}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{email.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">{email.from}</div>
                    </div>
                    <Badge variant={email.source === 'resend' ? 'default' : 'secondary'}>
                      {email.source}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    To: {email.to.join(', ')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(email.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <>
            <div className="border-b p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-semibold truncate">{selectedEmail.subject}</h2>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleCopy(selectedEmail.subject, 'subject')}
                      title="Copy subject"
                    >
                      {copiedId === 'subject' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">From:</span>
                      <span className="font-mono text-xs">{selectedEmail.from}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4"
                        onClick={() => handleCopy(selectedEmail.from, 'from')}
                        title="Copy from address"
                      >
                        {copiedId === 'from' ? (
                          <Check className="h-2 w-2 text-green-600" />
                        ) : (
                          <Copy className="h-2 w-2" />
                        )}
                      </Button>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">To:</span>
                      <span className="font-mono text-xs">{selectedEmail.to.join(', ')}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4"
                        onClick={() => handleCopy(selectedEmail.to.join(', '), 'to')}
                        title="Copy to addresses"
                      >
                        {copiedId === 'to' ? (
                          <Check className="h-2 w-2 text-green-600" />
                        ) : (
                          <Copy className="h-2 w-2" />
                        )}
                      </Button>
                    </div>
                    {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">CC:</span>
                          <span className="font-mono text-xs">{selectedEmail.cc.join(', ')}</span>
                        </div>
                      </>
                    )}
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Badge variant={selectedEmail.source === 'resend' ? 'default' : 'secondary'}>
                        {selectedEmail.source}
                      </Badge>
                      <span className="text-xs">{formatRelativeTime(selectedEmail.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setSelectedEmail(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteEmail(selectedEmail.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="html" className="w-full">
                    <TabsList>
                      <TabsTrigger value="html">HTML</TabsTrigger>
                      <TabsTrigger value="text">Text</TabsTrigger>
                      <TabsTrigger value="raw">Raw</TabsTrigger>
                    </TabsList>
                    <TabsContent value="html" className="mt-4">
                      {selectedEmail.html ? (
                        <div className="border rounded overflow-hidden">
                          <div
                            className="prose max-w-none p-4 bg-background email-content"
                            dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                            style={{
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              lineHeight: '1.6',
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-muted-foreground p-4 border rounded">No HTML content</div>
                      )}
                    </TabsContent>
                    <TabsContent value="text" className="mt-4">
                      {selectedEmail.text ? (
                        <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-sm">
                          {selectedEmail.text}
                        </pre>
                      ) : (
                        <div className="text-muted-foreground">No text content</div>
                      )}
                    </TabsContent>
                    <TabsContent value="raw" className="mt-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">Headers</h3>
                          <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                            {JSON.stringify(selectedEmail.raw?.headers || {}, null, 2)}
                          </pre>
                        </div>
                        {selectedEmail.raw?.mime && (
                          <div>
                            <h3 className="font-semibold mb-2">Raw MIME</h3>
                            <pre className="whitespace-pre-wrap border rounded p-4 bg-background font-mono text-xs overflow-auto">
                              {selectedEmail.raw.mime}
                            </pre>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select an email to view details
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

