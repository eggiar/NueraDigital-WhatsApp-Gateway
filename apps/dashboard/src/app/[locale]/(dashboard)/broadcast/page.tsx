"use client";

import { useState, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Play, Square, BarChart3, Upload, MessagesSquare } from 'lucide-react';

const broadcastSchema = z.object({
  name: z.string().min(1),
  deviceId: z.string().min(1),
  message: z.string().min(1),
});

interface BroadcastJob {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  failCount: number;
  totalCount: number;
  createdAt: string;
}

interface Device { id: string; name: string; status: string; }

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  running: 'default',
  completed: 'default',
  stopped: 'secondary',
  failed: 'destructive',
  draft: 'secondary',
};

export default function BroadcastPage() {
  const t = useTranslations('Broadcast');
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: broadcastJobs = [], isLoading } = useQuery<BroadcastJob[]>({
    queryKey: ['broadcasts'],
    queryFn: async () => (await api.get('/broadcast')).data,
    refetchInterval: 5000,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => (await api.get('/devices')).data,
  });

  const connectedDevices = devices.filter(d => d.status === 'connected');

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof broadcastSchema>) => {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('deviceId', values.deviceId);
      formData.append('message', values.message);
      if (csvFile) formData.append('csv', csvFile);
      return api.post('/broadcast', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      setAddOpen(false);
      form.reset();
      setCsvFile(null);
      toast.success('Siaran berhasil dibuat');
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Gagal membuat siaran'),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => api.post(`/broadcast/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['broadcasts'] }),
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => api.post(`/broadcast/${id}/stop`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['broadcasts'] }),
  });

  const form = useForm<z.infer<typeof broadcastSchema>>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { name: '', deviceId: '', message: '' },
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
              {t('newBroadcast')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('newBroadcast')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('campaignName')}</FormLabel>
                      <FormControl><Input placeholder="Promo Ramadan 2025" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('selectDevice')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={t('selectDevice')} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {connectedDevices.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>{t('uploadCSV')}</FormLabel>
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {csvFile ? csvFile.name : t('uploadCSVDesc')}
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('message')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Halo {name}, kami memiliki penawaran spesial untuk Anda!"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? '...' : t('newBroadcast')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 w-48 bg-muted rounded mb-2" />
                <div className="h-4 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : broadcastJobs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <MessagesSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('noBroadcast')}</h3>
          <p className="text-sm text-muted-foreground mt-1">Buat siaran pertama Anda untuk mengirim pesan massal.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {broadcastJobs.map((job) => {
            const progress = job.totalCount > 0
              ? Math.round(((job.sentCount + job.failCount) / job.totalCount) * 100)
              : 0;

            return (
              <Card key={job.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{job.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(job.createdAt), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                  <Badge variant={statusColors[job.status] ?? 'secondary'}>
                    {t(job.status as any) ?? job.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">{t('total')}: <strong>{job.totalCount}</strong></span>
                      <span className="text-green-600">{t('sent')}: <strong>{job.sentCount}</strong></span>
                      <span className="text-destructive">{t('failed')}: <strong>{job.failCount}</strong></span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{progress}% selesai</p>

                    <div className="flex gap-2">
                      {job.status === 'draft' && (
                        <Button size="sm" onClick={() => startMutation.mutate(job.id)} disabled={startMutation.isPending}>
                          <Play className="mr-2 h-4 w-4" />
                          {t('start')}
                        </Button>
                      )}
                      {job.status === 'running' && (
                        <Button size="sm" variant="outline" onClick={() => stopMutation.mutate(job.id)}>
                          <Square className="mr-2 h-4 w-4" />
                          {t('stop')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
