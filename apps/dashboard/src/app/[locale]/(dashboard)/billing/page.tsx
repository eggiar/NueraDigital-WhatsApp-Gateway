"use client";

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@/navigation';
import { apiGetData } from '@/lib/api';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Smartphone, MessageSquare, TrendingUp, ArrowRight } from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  expiredAt: string | null;
  plan: {
    name: string;
    deviceLimit: number;
    msgLimit: number;
    price: number;
  };
}

interface UsageLog {
  deviceId: string | null;
  msgCount: number;
}

export default function BillingPage() {
  const t = useTranslations('Billing');
  const router = useRouter();

  const { data: subscription } = useQuery<Subscription | null>({
    queryKey: ['subscription'],
    queryFn: async () => {
      try {
        return await apiGetData<Subscription | null>('/subscription');
      } catch {
        return null;
      }
    },
  });

  const { data: usage = { deviceCount: 0, msgCount: 0 } } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const logs = await apiGetData<UsageLog[]>('/usage');

      return {
        deviceCount: new Set(logs.map((log) => log.deviceId).filter(Boolean)).size,
        msgCount: logs.reduce((total, log) => total + (log.msgCount ?? 0), 0),
      };
    },
  });

  const devicePct = subscription
    ? Math.min(Math.round((usage.deviceCount / subscription.plan.deviceLimit) * 100), 100)
    : 0;
  const msgPct = subscription
    ? Math.min(Math.round((usage.msgCount / subscription.plan.msgLimit) * 100), 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">{t('currentPlan')}</CardTitle>
              <div className="mt-2">
                {subscription ? (
                  <>
                    <p className="text-2xl font-bold">{subscription.plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Rp {subscription.plan.price.toLocaleString('id-ID')}/bulan
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-semibold text-muted-foreground">{t('noSubscription')}</p>
                )}
              </div>
            </div>
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('expiredAt')}</span>
                  <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'destructive'}>
                    {subscription.expiredAt
                      ? format(new Date(subscription.expiredAt), 'dd MMMM yyyy', { locale: idLocale })
                      : '-'}
                  </Badge>
                </div>
                <Button variant="outline" className="w-full" onClick={() => router.push('/pricing' as any)}>
                  {t('upgrade')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={() => router.push('/pricing' as any)}>
                {t('upgrade')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              {t('usage')} (Bulan Ini)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  {t('devices')}
                </span>
                <span className="font-medium">
                  {usage.deviceCount} / {subscription?.plan.deviceLimit ?? '-'}
                </span>
              </div>
              <Progress value={devicePct} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('messages')}
                </span>
                <span className="font-medium">
                  {usage.msgCount.toLocaleString('id-ID')} / {subscription?.plan.msgLimit?.toLocaleString('id-ID') ?? '-'}
                </span>
              </div>
              <Progress value={msgPct} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
