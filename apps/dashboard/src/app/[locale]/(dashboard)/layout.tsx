"use client";

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from '@/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard, Smartphone, Send, MessagesSquare, Users, MessageCircle,
  Bot, Webhook, CreditCard, Settings, LogOut, FileText, BrainCircuit,
  Receipt, Shield, UserCog, Tag, Wrench, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useLocale } from 'next-intl';
import { usePathname as useNextPathname } from 'next/navigation';
import { useRouter as useNextRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const nextPathname = useNextPathname();
  const nextRouter = useNextRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  const isAdmin = user.roles.includes('admin') || user.roles.includes('superadmin');
  const isSuperAdmin = user.roles.includes('superadmin');

  const navigation = [
    { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('devices'), href: '/devices', icon: Smartphone },
    { name: t('send'), href: '/send', icon: Send },
    { name: t('broadcast'), href: '/broadcast', icon: MessagesSquare },
    { name: t('contacts'), href: '/contacts', icon: Users },
    { name: t('groups'), href: '/groups', icon: MessageCircle },
    { name: t('autoReply'), href: '/auto-reply', icon: Bot },
    { name: t('logs'), href: '/logs', icon: FileText },
    { name: t('webhooks'), href: '/webhooks', icon: Webhook },
    { name: t('billing'), href: '/billing', icon: CreditCard },
    { name: t('invoices'), href: '/invoices', icon: Receipt },
    { name: t('settings'), href: '/settings', icon: Settings },
    { name: t('aiSettings'), href: '/settings/ai', icon: BrainCircuit },
  ];

  const adminNav = [
    { name: t('adminUsers'), href: '/admin/users', icon: UserCog },
    { name: t('adminDevices'), href: '/admin/devices', icon: Smartphone },
    { name: t('adminTransactions'), href: '/admin/transactions', icon: Receipt },
    ...(isSuperAdmin ? [
      { name: t('adminPlans'), href: '/admin/plans', icon: Tag },
      { name: t('adminSystem'), href: '/admin/system', icon: Wrench },
    ] : []),
  ];

  const switchLocale = (newLocale: string) => {
    const segments = nextPathname.split('/');
    segments[1] = newLocale;
    nextRouter.push(segments.join('/'));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-lg font-bold text-primary">NueraDigital</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="pt-4 pb-1 px-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </p>
                </div>
                {adminNav.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href as any}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <header className="h-16 border-b bg-card flex items-center justify-end px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  {locale === 'id' ? '🇮🇩 ID' : '🇺🇸 EN'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => switchLocale('id')}>
                  🇮🇩 Bahasa Indonesia
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale('en')}>
                  🇺🇸 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Info */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="text-sm">{user.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />{t('settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
