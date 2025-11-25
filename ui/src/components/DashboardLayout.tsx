import { Github } from "lucide-react";
import { Button } from "./ui/button";
import { Sidebar } from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";

export const DashboardLayout = () => {
  const location = useLocation();
  const currentView = location.pathname.startsWith("/ui/emails")
    ? "emails"
    : "settings";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={currentView} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b bg-background h-15 overflow-hidden flex items-center justify-end">
          <Button variant="ghost" size="icon">
            <a
              href="https://github.com/tomaspozo/resend-box"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto flex justify-center w-full px-4 py-6">
          <div className="w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
