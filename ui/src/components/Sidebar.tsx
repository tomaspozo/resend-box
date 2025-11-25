import { useState, useEffect } from "react";
import { Mail, Settings, Moon, Sun, ChevronsLeftRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

const navigationItems = [
  { id: "emails", label: "Emails", icon: Mail, path: "/emails" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

export const Sidebar = ({ currentView: _currentView }: { currentView?: string }) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newTheme = theme === "light" ? "dark" : "light";
    root.classList.toggle("dark", newTheme === "dark");
    setTheme(newTheme);
  };

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-sidebar-bg border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-4.5 px-5 border-b border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center"
          )}
        >
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">
              Resend Box
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-sidebar-accent rounded-md transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeftRight className="h-4 w-4 text-sidebar-foreground" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 hover:bg-sidebar-accent rounded-md transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronsLeftRight className="h-4 w-4 text-sidebar-foreground" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-1",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}
        >
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-sidebar-accent rounded-md transition-colors"
            aria-label="Toggle theme"
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 text-sidebar-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-sidebar-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
