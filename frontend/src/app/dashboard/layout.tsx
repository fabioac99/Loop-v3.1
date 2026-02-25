'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore, requestNotificationPermission } from '@/stores/notifications';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Ticket, Users, Building2, BarChart3, Settings, FileText, Shield,
  ClipboardList,
  Bell, Search, LogOut, Menu, Moon, Sun, Plus, Check, CheckCheck, X, ExternalLink, Truck,
} from 'lucide-react';

/* ============================== NOTIFICATION POPUP ============================== */
function NotificationPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAsUnread, markAllAsRead } = useNotificationStore();
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={popupRef} className="absolute right-0 top-full mt-2 w-[400px] max-h-[520px] bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center gap-1 text-[11px] text-primary hover:underline px-2 py-1 rounded-lg hover:bg-accent transition-colors">
              <CheckCheck size={12} /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent text-muted-foreground"><X size={14} /></button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell size={24} className="mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-all cursor-pointer group ${!n.isRead ? 'bg-primary/[0.04]' : ''}`}
              >
                {/* Unread indicator */}
                <div className="mt-1.5 shrink-0">
                  {!n.isRead ? (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  )}
                </div>

                {/* Content */}
                <Link
                  href={n.data?.ticketId ? `/dashboard/tickets/${n.data.ticketId}` : '#'}
                  onClick={async () => {
                    if (!n.isRead) await markAsRead(n.id);
                    onClose();
                  }}
                  className="flex-1 min-w-0"
                >
                  <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium text-foreground/80'}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    {n.data?.ticketNumber && (
                      <span className="text-[10px] font-mono text-primary/70">{n.data.ticketNumber}</span>
                    )}
                  </div>
                </Link>

                {/* Quick actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-0.5">
                  {n.isRead ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsUnread(n.id); }}
                      className="p-1 rounded hover:bg-accent text-muted-foreground" title="Mark as unread"
                    >
                      <Bell size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      className="p-1 rounded hover:bg-accent text-muted-foreground" title="Mark as read"
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ============================== BRANDING HOOK ============================== */
function useBranding() {
  const [branding, setBranding] = useState<{
    logoUrl: string | null;
    logoLightUrl: string | null;
    brandName: string;
    showBrandName: boolean;
    expandLogo: boolean;
  }>({ logoUrl: null, logoLightUrl: null, brandName: 'LOOP', showBrandName: true, expandLogo: false });

  useEffect(() => {
    api.getSettings().then((s: any) => {
      setBranding({
        logoUrl: s.logoFileId ? `${api.baseUrl}/files/${s.logoFileId}` : null,
        logoLightUrl: s.logoLightFileId ? `${api.baseUrl}/files/${s.logoLightFileId}` : null,
        brandName: s.brandName || 'LOOP',
        showBrandName: s.showBrandName ?? true,
        expandLogo: s.expandLogo ?? false,
      });
    }).catch(() => { });
  }, []);

  return branding;
}

/* ============================== MAIN LAYOUT ============================== */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, loadUser, logout, isAdmin } = useAuthStore();
  const { unreadCount, fetchNotifications, fetchUnreadTicketIds } = useNotificationStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('loop-theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const branding = useBranding();

  // Initialize WebSocket connection
  useSocket();

  useEffect(() => { loadUser(); requestNotificationPermission(); }, [loadUser]);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadTicketIds();
    }
    // Reduced polling since WebSocket handles real-time updates now
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchNotifications();
        fetchUnreadTicketIds();
      }
    }, 120000); // 2 minutes fallback instead of 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications, fetchUnreadTicketIds]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('loop-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeout = setTimeout(async () => {
        try { setSearchResults(await api.search(searchQuery)); } catch { }
      }, 300);
      return () => clearTimeout(timeout);
    } else { setSearchResults(null); }
  }, [searchQuery]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hp = (p: string) => useAuthStore.getState().hasPermission(p);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/tickets', icon: Ticket, label: 'Tickets' },
    ...(hp('admin.access') ? [
      { href: '/dashboard/admin', icon: Shield, label: 'Admin Panel' },
    ] : []),
    ...(hp('users.manage') ? [
      { href: '/dashboard/users', icon: Users, label: 'Users' },
    ] : []),
    ...(hp('departments.manage') ? [
      { href: '/dashboard/departments', icon: Building2, label: 'Departments' },
    ] : []),
    ...(hp('admin.access') ? [
      { href: '/dashboard/entities', icon: Truck, label: 'Clients & Suppliers' },
    ] : []),
    ...(hp('forms.manage') ? [
      { href: '/dashboard/forms', icon: FileText, label: 'Form Builder' },
    ] : []),
    ...(hp('analytics.view') || useAuthStore.getState().isDeptHead() ? [
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/dashboard/team-performance', icon: Users, label: 'Team Performance' },
      { href: '/dashboard/reports', icon: ClipboardList, label: 'Reports' },
    ] : []),
    ...(hp('audit.view') ? [
      { href: '/dashboard/audit', icon: Shield, label: 'Audit Log' },
    ] : []),
    ...(hp('settings.manage') ? [
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ] : []),
  ];

  const handleLogout = async () => { await logout(); router.push('/auth'); };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[70px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative z-40 h-full bg-card border-r border-border flex flex-col transition-all duration-200`}>
        <div className="h-16 flex items-center px-5 gap-3 border-b border-border shrink-0">
          {(() => {
            const currentLogo = (!dark && branding.logoLightUrl) ? branding.logoLightUrl : branding.logoUrl;
            const shouldExpand = branding.expandLogo && (!branding.showBrandName || !sidebarOpen);
            if (currentLogo) {
              return <img src={currentLogo} alt="Logo" className={`rounded-lg object-contain shrink-0 transition-all ${shouldExpand ? 'h-10 w-auto max-w-[140px]' : 'h-8 w-8'}`} />;
            }
            return (
              <div className={`rounded-lg bg-primary/10 flex items-center justify-center shrink-0 transition-all ${shouldExpand ? 'w-10 h-10' : 'w-8 h-8'}`}>
                <div className="w-4 h-4 rounded-full border-[2.5px] border-primary" />
              </div>
            );
          })()}
          {sidebarOpen && branding.showBrandName && <span className="font-bold text-lg tracking-tight">{branding.brandName}</span>}
        </div>
        <div className="px-3 pt-4 pb-2">
          <Link href="/dashboard/tickets?new=true"
            className={`flex items-center gap-2 h-10 ${sidebarOpen ? 'px-4' : 'justify-center'} bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all`}>
            <Plus size={16} />{sidebarOpen && 'New Request'}
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 h-10 ${sidebarOpen ? 'px-3' : 'justify-center'} rounded-xl text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                <item.icon size={18} />{sidebarOpen && item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className={`flex items-center gap-3 ${sidebarOpen ? 'px-3' : 'justify-center'} py-2`}>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.department?.name || 'Admin'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-4 md:px-6 gap-4 shrink-0 bg-card/80 backdrop-blur-sm">
          <button onClick={() => { setSidebarOpen(!sidebarOpen); setMobileOpen(!mobileOpen); }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <Menu size={18} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search tickets, users, departments..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            {searchFocused && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                {searchResults.tickets?.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Tickets</p>
                    {searchResults.tickets.map((t: any) => (
                      <Link key={t.id} href={`/dashboard/tickets/${t.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{t.ticketNumber}</span>
                        <span className="truncate">{t.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.users?.length > 0 && (
                  <div className="p-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Users</p>
                    {searchResults.users.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm">
                        <span>{u.firstName} {u.lastName}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(!searchResults.tickets?.length && !searchResults.users?.length) && (
                  <p className="p-4 text-sm text-muted-foreground text-center">No results found</p>
                )}
              </div>
            )}
          </div>

          {/* Actions — pushed to the right */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button onClick={() => setDark(!dark)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification bell + popup */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors ${notifOpen ? 'bg-accent text-foreground' : ''}`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-in fade-in">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPopup open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}