import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Briefcase, LayoutDashboard, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";

export function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  async function handleLogout() {
    await logout();
    toast({ title: "Signed out", description: "See you next application!" });
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-semibold">
              <Briefcase className="h-5 w-5 text-primary" />
              JobTrackr
            </div>
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              <NavLink
                to="/board"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <LayoutDashboard className="h-4 w-4" />
                Board
              </NavLink>
              <NavLink
                to="/stats"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                Stats
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
