"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';
import { QRModal } from '@/components/qr-modal';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, QrCode, Trash2, WifiOff, Smartphone } from 'lucide-react';

const deviceSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
});

interface Device {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  lastSeen: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('Devices');
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    connected: { label: t('connected'), variant: 'default' },
    disconnected: { label: t('disconnected'), variant: 'destructive' },
    connecting: { label: t('connecting'), variant: 'secondary' },
  };
  const normalizedStatus = status.toLowerCase();
  const { label, variant } = config[normalizedStatus] ?? { label: status, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
}

export default function DevicesPage() {
  const t = useTranslations('Devices');
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [qrDevice, setQrDevice] = useState<Device | null>(null);

  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => apiGetData<Device[]>('/devices'),
  });

  const addMutation = useMutation({
    mutationFn: (data: z.infer<typeof deviceSchema>) => api.post('/devices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setAddOpen(false);
      form.reset();
      toast.success('Perangkat berhasil ditambahkan');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Gagal menambahkan perangkat');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/devices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Perangkat berhasil dihapus');
    },
  });

  const form = useForm<z.infer<typeof deviceSchema>>({
    resolver: zodResolver(deviceSchema),
    defaultValues: { name: '', phone: '' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('addDevice')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addDevice')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => addMutation.mutate(v))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('deviceName')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: iPhone Marketing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')} (opsional)</FormLabel>
                      <FormControl>
                        <Input placeholder="628123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? '...' : t('addDevice')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('noDevices')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t('noDevicesDesc')}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Card key={device.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{device.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {device.phone || 'Belum tersambung'}
                  </p>
                </div>
                <StatusBadge status={device.status} />
              </CardHeader>
              <CardContent>
                {device.lastSeen && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {t('lastSeen')}: {new Date(device.lastSeen).toLocaleString('id-ID')}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setQrDevice(device)}
                    disabled={device.status.toLowerCase() === 'connected'}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    {t('scanQR')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(device.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {qrDevice && (
        <QRModal
          deviceId={qrDevice.id}
          deviceName={qrDevice.name}
          open={!!qrDevice}
          onOpenChange={(open) => !open && setQrDevice(null)}
          onConnected={() => queryClient.invalidateQueries({ queryKey: ['devices'] })}
        />
      )}
    </div>
  );
}
