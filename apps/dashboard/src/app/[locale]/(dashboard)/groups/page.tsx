"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiGetData } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageCircle } from 'lucide-react';

interface Device { id: string; name: string; status: string; }
interface Group { id: string; jid: string; name: string; memberCount: number; }

export default function GroupsPage() {
  const t = useTranslations('Groups');
  const [selectedDevice, setSelectedDevice] = useState('');

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => apiGetData<Device[]>('/devices'),
  });

  const connectedDevices = devices.filter((device) => device.status.toLowerCase() === 'connected');

  const { data: groups = [], isLoading, refetch } = useQuery<Group[]>({
    queryKey: ['groups', selectedDevice],
    queryFn: async () => {
      if (!selectedDevice) return [];
      return apiGetData<Group[]>(`/groups/${selectedDevice}`);
    },
    enabled: !!selectedDevice,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedDevice} onValueChange={setSelectedDevice}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={t('selectDevice')} />
          </SelectTrigger>
          <SelectContent>
            {connectedDevices.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedDevice && (
          <Button variant="outline" onClick={() => refetch()} size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {groups.length > 0 ? `${groups.length} grup ditemukan` : ''}
        </span>
      </div>

      {!selectedDevice ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('noGroups')}</h3>
          <p className="text-sm text-muted-foreground">{t('noGroupsDesc')}</p>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 w-40 bg-muted rounded mb-2" />
                <div className="h-4 w-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Tidak ada grup ditemukan di perangkat ini.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[160px]">{group.jid}</span>
                  <Badge variant="secondary">
                    {group.memberCount} {t('members')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
