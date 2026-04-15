"use client";

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiGetData } from '@/lib/api';
import { Link } from '@/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, Smartphone, MessageSquare, CreditCard,
  ArrowRight, TrendingUp, Activity, Shield,
} from 'lucide-react';

interface AdminStats {
  userCount: number;
  deviceCount: number;
  messageCount: number;
  activeSubs: number;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  plan: { name: string };
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  SETTLEMENT: 'default',
  PAID: 'default',
  PENDING: 'secondary',
  FAILED: 'destructive',
  EXPIRED: 'destructive',
};

export default function AdminPage() {
  const t = useTranslations('Admin');

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => apiGetData<AdminStats>('/admin/stats'),
    refetchInterval: 30000,
  });

  const { data: recentTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ['admin-transactions'],
    queryFn: async () => apiGetData<Transaction[]>('/admin/transactions'),
    select: (data) => data.slice(0, 5),
  });

  const statCards = [
    {
      title: 'Total Pengguna',
      value: stats?.userCount ?? 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      href: '/admin/users',
    },
    {
      title: 'Total Perangkat',
      value: stats?.deviceCount ?? 0,
      icon: Smartphone,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      href: '/admin/devices',
    },
    {
      title: 'Total Pesan',
      value: stats?.messageCount?.toLocaleString('id-ID') ?? 0,
      icon: MessageSquare,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      href: '/admin/transactions',
    },
    {
      title: 'Langganan Aktif',
      value: stats?.activeSubs ?? 0,
      icon: CreditCard,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      href: '/admin/transactions',
    },
  ];

  const quickLinks = [
    { label: 'Kelola Pengguna', href: '/admin/users', icon: Users, desc: 'Lihat, suspend, dan ubah role pengguna' },
    { label: 'Monitor Perangkat', href: '/admin/devices', icon: Smartphone, desc: 'Pantau semua device WhatsApp' },
    { label: 'Semua Transaksi', href: '/admin/transactions', icon: CreditCard, desc: 'Riwayat pembayaran & pendapatan' },
    { label: 'Paket Harga', href: '/admin/plans', icon: TrendingUp, desc: 'CRUD paket berlangganan' },
    { label: 'Konfigurasi Sistem', href: '/admin/system', icon: Activity, desc: 'SMTP, AI internal, maintenance' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">Monitor dan kelola seluruh platform NueraDigital.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href as any}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6">
                {statsLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className={`rounded-full p-3 ${card.bg}`}>
                      <card.icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href as any}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <link.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/transactions">Lihat semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi.</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{tx.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{tx.plan?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Rp {tx.amount?.toLocaleString('id-ID')}</p>
                      <Badge variant={statusVariant[tx.status] ?? 'secondary'} className="text-xs">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
