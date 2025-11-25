import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Sidebar } from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";

export const DashboardLayout = () => {
  const location = useLocation();
  const currentView = location.pathname.startsWith("/emails")
    ? "emails"
    : "settings";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={currentView} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b bg-background px-6 py-3 flex items-center justify-end gap-4">
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Feedback
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              F
            </kbd>
          </Button>
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Help
          </a>
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </a>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold text-sm">
            F
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 h-content overflow-y-auto flex justify-center w-full">
          <div className="w-full max-w-5xl pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
