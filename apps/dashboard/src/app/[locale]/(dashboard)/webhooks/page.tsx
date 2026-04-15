"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  createdAt: string;
}

interface WebhookLog {
  id: string;
  event: string;
  statusCode: number | null;
  createdAt: string;
}

function EventSelector({
  form,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof webhookSchema>>>;
}) {
  return (
    <FormField control={form.control} name="events" render={() => (
      <FormItem>
        <FormLabel>Event</FormLabel>
        <div className="space-y-2">
          {AVAILABLE_EVENTS.map((event) => (
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
                            : current.filter((value) => value !== event.value)
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
  );
}

export default function WebhooksPage() {
  const t = useTranslations('Webhooks');
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [logsWebhook, setLogsWebhook] = useState<WebhookEndpoint | null>(null);
  const [editWebhook, setEditWebhook] = useState<WebhookEndpoint | null>(null);

  const { data: webhooks = [], isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ['webhooks'],
    queryFn: async () => apiGetData<WebhookEndpoint[]>('/webhooks'),
  });

  const { data: logs = [] } = useQuery<WebhookLog[]>({
    queryKey: ['webhook-logs', logsWebhook?.id],
    queryFn: async () => {
      if (!logsWebhook) return [];
      return apiGetData<WebhookLog[]>(`/webhooks/${logsWebhook.id}/logs`);
    },
    enabled: !!logsWebhook,
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof webhookSchema>) => api.post('/webhooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setAddOpen(false);
      createForm.reset();
      toast.success('Webhook berhasil ditambahkan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof webhookSchema> }) =>
      api.put(`/webhooks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setEditWebhook(null);
      toast.success('Webhook berhasil diperbarui');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/webhooks/${id}/test`),
    onSuccess: () => toast.success('Test webhook terkirim'),
    onError: () => toast.error('Gagal mengirim test webhook'),
  });

  const createForm = useForm<z.infer<typeof webhookSchema>>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: '', secret: '', events: [] },
  });

  const editForm = useForm<z.infer<typeof webhookSchema>>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: '', secret: '', events: [] },
  });

  const openEdit = (webhook: WebhookEndpoint) => {
    setEditWebhook(webhook);
    editForm.reset({
      url: webhook.url,
      secret: '',
      events: webhook.events,
    });
  };

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
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
                <FormField control={createForm.control} name="url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('url')}</FormLabel>
                    <FormControl><Input placeholder="https://example.com/webhook" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="secret" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('secret')}</FormLabel>
                    <FormControl><Input type="password" placeholder="Opsional" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <EventSelector form={createForm} />
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
          {[1, 2].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardContent className="p-6"><div className="h-12 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Webhook className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{t('noWebhooks')}</h3>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-mono">{webhook.url}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="secondary" className="text-xs">{event}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="secondary">{format(new Date(webhook.createdAt), 'dd MMM yyyy HH:mm')}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(webhook)}>
                    <Pencil className="mr-2 h-3 w-3" />Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => testMutation.mutate(webhook.id)} disabled={testMutation.isPending}>
                    <Send className="mr-2 h-3 w-3" />{t('test')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setLogsWebhook(webhook)}>
                    <History className="mr-2 h-3 w-3" />{t('viewLogs')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(webhook.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!logsWebhook} onOpenChange={(open) => !open && setLogsWebhook(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Pengiriman Webhook</DialogTitle>
          </DialogHeader>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Belum ada log pengiriman.</p>
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
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell><Badge variant="secondary">{log.event}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={log.statusCode && log.statusCode < 300 ? 'default' : 'destructive'}>
                        {log.statusCode ?? 'Error'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), 'dd MMM HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editWebhook} onOpenChange={(open) => !open && setEditWebhook(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Webhook</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((values) => editWebhook && updateMutation.mutate({ id: editWebhook.id, data: values }))}
              className="space-y-4"
            >
              <FormField control={editForm.control} name="url" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('url')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="secret" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('secret')}</FormLabel>
                  <FormControl><Input type="password" placeholder="Kosongkan jika tidak diubah" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <EventSelector form={editForm} />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? '...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
