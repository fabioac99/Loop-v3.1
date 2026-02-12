'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import { api } from '@/lib/api';
import {
  LayoutDashboard, Ticket, Users, Building2, BarChart3, Settings, FileText, Shield,
  Bell, Search, LogOut, ChevronDown, Menu, X, Moon, Sun, Plus,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, loadUser, logout, isAdmin } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth');
  }, [isLoading, isAuthenticated, router]);
  useEffect(() => {
    if (isAuthenticated) fetchNotifications();
    const interval = setInterval(() => { if (isAuthenticated) fetchNotifications(); }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeout = setTimeout(async () => {
        try {
          const results = await api.search(searchQuery);
          setSearchResults(results);
        } catch {}
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/tickets', icon: Ticket, label: 'Tickets' },
    ...(isAdmin() ? [
      { href: '/dashboard/users', icon: Users, label: 'Users' },
      { href: '/dashboard/departments', icon: Building2, label: 'Departments' },
      { href: '/dashboard/forms', icon: FileText, label: 'Form Builder' },
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/dashboard/audit', icon: Shield, label: 'Audit Log' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ] : []),
    ...(useAuthStore.getState().isDeptHead() && !isAdmin() ? [
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
    ] : []),
  ];

  const handleLogout = async () => { await logout(); router.push('/auth'); };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[70px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative z-40 h-full bg-card border-r border-border flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 rounded-full border-[2.5px] border-primary" />
          </div>
          {sidebarOpen && <span className="font-bold text-lg tracking-tight">LOOP</span>}
        </div>

        {/* New Ticket */}
        <div className="px-3 pt-4 pb-2">
          <Link href="/dashboard/tickets?new=true"
            className={`flex items-center gap-2 h-10 ${sidebarOpen ? 'px-4' : 'justify-center'} bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-all`}>
            <Plus size={16} />
            {sidebarOpen && 'New Request'}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 h-10 ${sidebarOpen ? 'px-3' : 'justify-center'} rounded-xl text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                <item.icon size={18} />
                {sidebarOpen && item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
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
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center px-4 md:px-6 gap-4 shrink-0 bg-card/80 backdrop-blur-sm">
          <button onClick={() => { setSidebarOpen(!sidebarOpen); setMobileOpen(!mobileOpen); }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <Menu size={18} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search tickets, users, departments..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            {searchFocused && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                {searchResults.tickets?.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Tickets</p>
                    {searchResults.tickets.map((t: any) => (
                      <Link key={t.id} href={`/dashboard/tickets/${t.id}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm">
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

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!dark)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link href="/dashboard/notifications" className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
