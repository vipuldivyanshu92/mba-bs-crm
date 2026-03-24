import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, Building2, Bell, MessageSquare, Settings, LogOut, Plus, Menu, X, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogMeetingDialog } from '@/components/LogMeetingDialog';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/companies', icon: Building2, label: 'Pipeline' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logMeetingOpen, setLogMeetingOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
            <Flame className="w-4.5 h-4.5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-accent-foreground tracking-tight">WarmIntro</span>
        </div>

        <div className="px-4 py-4">
          <Button
            onClick={() => setLogMeetingOpen(true)}
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Meeting
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === item.to
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.school || 'MBA Student'}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-accent-foreground">WarmIntro</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setLogMeetingOpen(true)} className="bg-sidebar-primary text-sidebar-primary-foreground">
            <Plus className="w-4 h-4" />
          </Button>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-sidebar pt-16">
          <nav className="px-4 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                  pathname === item.to
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 mt-4">
            <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 text-sm text-sidebar-foreground/60">
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>

      <LogMeetingDialog open={logMeetingOpen} onOpenChange={setLogMeetingOpen} />
    </div>
  );
}
