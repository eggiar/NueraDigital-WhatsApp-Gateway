"use client";

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/navigation';
import { useAuth } from '@/hooks/use-auth';
import { apiGetData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ArrowRight, CreditCard, MessageSquare, Smartphone, Users, MessagesSquare } from 'lucide-react';

interface Device {
  id: string;
  status: string;
}

interface BroadcastJob {
  id: string;
  status: string;
}

interface UsageLog {
  msgCount: number;
}

interface AdminStats {
  userCount: number;
  deviceCount: number;
  messageCount: number;
  activeSubs: number;
}

export default function DashboardHome() {
  const t = useTranslations('Dashboard');
  const { user } = useAuth();
  const isAdmin = !!user && (user.roles.includes('admin') || user.roles.includes('superadmin'));

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => apiGetData<Device[]>('/devices'),
  });

  const { data: broadcasts = [] } = useQuery<BroadcastJob[]>({
    queryKey: ['broadcasts'],
    queryFn: async () => apiGetData<BroadcastJob[]>('/broadcast'),
  });

  const { data: usageLogs = [] } = useQuery<UsageLog[]>({
    queryKey: ['usage'],
    queryFn: async () => apiGetData<UsageLog[]>('/usage'),
  });

  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => apiGetData<AdminStats>('/admin/stats'),
    enabled: isAdmin,
  });

  const activeDevices = devices.filter((device) => device.status.toLowerCase() === 'connected').length;
  const totalMessages = usageLogs.reduce((total, log) => total + (log.msgCount ?? 0), 0);
  const runningBroadcasts = broadcasts.filter((job) => job.status.toLowerCase() === 'running').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('totalMessages')}</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">{usageLogs.length} hari log penggunaan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('activeDevices')}</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDevices} / {devices.length}</div>
            <p className="text-xs text-muted-foreground">{t('availableSlots')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('broadcasts')}</CardTitle>
            <MessagesSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{broadcasts.length}</div>
            <p className="text-xs text-muted-foreground">{runningBroadcasts} {t('pending')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? 'System Users' : t('apiStatus')}
            </CardTitle>
            {isAdmin ? <Users className="h-4 w-4 text-muted-foreground" /> : <Activity className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {isAdmin ? adminStats?.userCount ?? 0 : t('healthy')}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? `${adminStats?.activeSubs ?? 0} subscription aktif` : `API ${t('healthy').toLowerCase()}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href="/send" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent">
              <span>{t('sendMessage')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/devices" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent">
              <span>{t('addDevice')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/broadcast" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent">
              <span>{t('newBroadcast')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/billing" className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent">
              <span>Kelola langganan</span>
              <CreditCard className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        {isAdmin && adminStats ? (
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Sistem</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total User</p>
                <p className="mt-2 text-2xl font-semibold">{adminStats.userCount}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total Device</p>
                <p className="mt-2 text-2xl font-semibold">{adminStats.deviceCount}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total Pesan</p>
                <p className="mt-2 text-2xl font-semibold">{adminStats.messageCount}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
