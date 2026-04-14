"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { FileText } from 'lucide-react';

interface Message {
  id: string;
  to: string;
  type: string;
  status: string;
  sentAt: string;
  device?: { name: string };
}

interface Device { id: string; name: string; }

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  sent: 'default',
  failed: 'destructive',
  pending: 'secondary',
};

export default function LogsPage() {
  const t = useTranslations('Logs');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => (await api.get('/devices')).data,
  });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['messages', statusFilter, deviceFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (deviceFilter !== 'all') params.deviceId = deviceFilter;
      return (await api.get('/messages', { params })).data;
    },
    refetchInterval: 10000,
  });

  const filtered = messages.filter(m =>
    m.to.includes(search) || m.type.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Cari nomor atau tipe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="sent">{t('sent')}</SelectItem>
            <SelectItem value="failed">{t('failed')}</SelectItem>
            <SelectItem value="pending">{t('pending')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deviceFilter} onValueChange={setDeviceFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filterDevice')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            {devices.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">{filtered.length} pesan</span>
      </div>

      {isLoading ? (
        <Card>
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('noLogs')}</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('device')}</TableHead>
                <TableHead>{t('recipient')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('sentAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium">
                    {msg.device?.name ?? '-'}
                  </TableCell>
                  <TableCell>{msg.to}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{msg.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[msg.status] ?? 'secondary'}>
                      {t(msg.status as any) ?? msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(msg.sentAt), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
