"use client";

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiGetData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AdminDevice {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminDevicesPage() {
  const t = useTranslations('Navigation');

  const { data: devices = [], isLoading } = useQuery<AdminDevice[]>({
    queryKey: ['admin-devices'],
    queryFn: async () => apiGetData<AdminDevice[]>('/admin/devices'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('adminDevices')}</h2>
        <p className="text-muted-foreground">Pantau semua device lintas akun dari satu tabel.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total device: {devices.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perangkat</TableHead>
                  <TableHead>Pemilik</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      <div>{device.user.name}</div>
                      <div className="text-xs text-muted-foreground">{device.user.email}</div>
                    </TableCell>
                    <TableCell>{device.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={device.status?.toLowerCase() === 'connected' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(device.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
