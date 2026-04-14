"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Send, History, Webhook } from 'lucide-react';

const webhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
});

const AVAILABLE_EVENTS = [
  { value: 'message.sent', label: 'Pesan Terkirim' },
  { value: 'message.failed', label: 'Pesan Gagal' },
  { value: 'message.received', label: 'Pesan Masuk' },
  { value: 'device.connected', label: 'Device Terhubung' },
  { value: 'device.disconnected', label: 'Device Terputus' },
  { value: 'broadcast.completed', label: 'Siaran Selesai' },
];

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  event: string;
  statusCode: number | null;
  createdAt: string;
}

export default function WebhooksPage() {
  const t = useTranslations('Webhooks');
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [logsWebhook, setLogsWebhook] = useState<WebhookEndpoint | null>(null);

  const { data: webhooks = [], isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ['webhooks'],
    queryFn: async () => (await api.get('/webhooks')).data,
  });

  const { data: logs = [] } = useQuery<WebhookLog[]>({
    queryKey: ['webhook-logs', logsWebhook?.id],
    queryFn: async () => {
      if (!logsWebhook) return [];
      return (await api.get(`/webhooks/${logsWebhook.id}/logs`)).data;
    },
    enabled: !!logsWebhook,
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof webhookSchema>) => api.post('/webhooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setAddOpen(false);
      form.reset();
      toast.success('Webhook berhasil ditambahkan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/webhooks/${id}/test`),
    onSuccess: () => toast.success('Test webhook terkirim!'),
    onError: () => toast.error('Gagal mengirim test webhook'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/webhooks/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const form = useForm<z.infer<typeof webhookSchema>>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: '', secret: '', events: [], isActive: true },
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
            <Button><Plus className="mr-2 h-4 w-4" />{t('addWebhook')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('addWebhook')}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('url')}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-server.com/webhook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="secret" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('secret')} (opsional)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Rahasia untuk verifikasi signature" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="events" render={() => (
                  <FormItem>
                    <FormLabel>{t('events')}</FormLabel>
                    <div className="space-y-2">
                      {AVAILABLE_EVENTS.map(event => (
                        <FormField
                          key={event.value}
                          control={form.control}
                          name="events"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(event.value)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    field.onChange(
                                      checked
                                        ? [...current, event.value]
                                        : current.filter(v => v !== event.value)
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="cursor-pointer font-normal">{event.label}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? '...' : 'Simpan'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-12 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('noWebhooks')}</h3>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <Card key={wh.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-mono">{wh.url}</CardTitle>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.map(ev => (
                      <Badge key={ev} variant="secondary" className="text-xs">{ev}</Badge>
                    ))}
                  </div>
                </div>
                <Switch
                  checked={wh.isActive}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: wh.id, isActive: v })}
                />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => testMutation.mutate(wh.id)} disabled={testMutation.isPending}>
                    <Send className="mr-2 h-3 w-3" />{t('test')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setLogsWebhook(wh)}>
                    <History className="mr-2 h-3 w-3" />{t('viewLogs')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(wh.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Logs Dialog */}
      <Dialog open={!!logsWebhook} onOpenChange={(open) => !open && setLogsWebhook(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Pengiriman Webhook</DialogTitle>
          </DialogHeader>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada log pengiriman.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>{t('statusCode')}</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell><Badge variant="secondary">{log.event}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={log.statusCode && log.statusCode < 300 ? 'default' : 'destructive'}>
                        {log.statusCode ?? 'Error'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(log.createdAt), 'dd MMM HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
