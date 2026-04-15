"use client";

import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Play, Square, Upload, MessagesSquare, CheckCircle2,
  ChevronRight, ChevronLeft, Clock, BarChart3, Users, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const broadcastSchema = z.object({
  name: z.string().min(1, 'Nama kampanye wajib diisi'),
  deviceId: z.string().min(1, 'Pilih perangkat terlebih dahulu'),
  message: z.string().min(1, 'Pesan wajib diisi'),
  scheduleAt: z.string().optional(),
});

interface BroadcastJob {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  failCount: number;
  createdAt: string;
  updatedAt?: string;
  _count?: { recipients: number };
}

interface Device {
  id: string;
  name: string;
  phone?: string;
  status: string;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  RUNNING: 'default',
  COMPLETED: 'default',
  FAILED: 'destructive',
  DRAFT: 'secondary',
  STOPPED: 'secondary',
};

const statusLabels: Record<string, string> = {
  RUNNING: 'Berjalan',
  COMPLETED: 'Selesai',
  FAILED: 'Gagal',
  DRAFT: 'Draf',
  STOPPED: 'Dihentikan',
};

function parseCsvContacts(raw: string): string[] {
  const rows = raw
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length <= 1) return [];

  const headers = rows[0].split(',').map((v) => v.trim().toLowerCase());
  const phoneIndex = headers.indexOf('phone');
  if (phoneIndex === -1) return [];

  return rows.slice(1)
    .map((row) => row.split(',').map((v) => v.trim()))
    .map((cols) => cols[phoneIndex] || '')
    .filter(Boolean);
}

const WIZARD_STEPS = [
  { id: 1, label: 'Perangkat', icon: MessagesSquare },
  { id: 2, label: 'Kontak', icon: Users },
  { id: 3, label: 'Pesan', icon: FileText },
  { id: 4, label: 'Konfirmasi', icon: CheckCircle2 },
];

export default function BroadcastPage() {
  const t = useTranslations('Broadcast');
  const queryClient = useQueryClient();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPhones, setCsvPhones] = useState<string[]>([]);
  const [stopJobId, setStopJobId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: broadcastJobs = [], isLoading } = useQuery<BroadcastJob[]>({
    queryKey: ['broadcasts'],
    queryFn: async () => apiGetData<BroadcastJob[]>('/broadcast'),
    refetchInterval: 5000,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => apiGetData<Device[]>('/devices'),
  });

  const connectedDevices = useMemo(
    () => devices.filter((d) => d.status?.toUpperCase() === 'CONNECTED'),
    [devices]
  );

  const form = useForm<z.infer<typeof broadcastSchema>>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { name: '', deviceId: '', message: '', scheduleAt: '' },
  });

  const selectedDeviceId = form.watch('deviceId');
  const selectedDevice = connectedDevices.find((d) => d.id === selectedDeviceId);

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof broadcastSchema>) => {
      if (csvPhones.length === 0) {
        throw new Error('Upload CSV dengan minimal satu nomor telepon');
      }

      const createRes = await api.post('/broadcast', {
        name: values.name,
        deviceId: values.deviceId,
        phones: csvPhones,
      });

      const jobId = createRes.data?.data?.id;
      const shouldStartNow = !values.scheduleAt || new Date(values.scheduleAt) <= new Date();

      if (jobId && shouldStartNow) {
        await api.post(`/broadcast/${jobId}/start`, {
          deviceId: values.deviceId,
          content: values.message,
          messageType: 'TEXT',
        });
      }

      return { jobId, shouldStartNow };
    },
    onSuccess: ({ shouldStartNow }) => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      closeWizard();
      toast.success(
        shouldStartNow
          ? 'Siaran dibuat dan langsung dijalankan!'
          : 'Siaran disimpan sebagai draf terjadwal.'
      );
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.error || error.message || 'Gagal membuat siaran'),
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => api.post(`/broadcast/${id}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      setStopJobId(null);
      toast.success('Broadcast dihentikan');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal menghentikan'),
  });

  const startDraftMutation = useMutation({
    mutationFn: ({ id, deviceId, message }: { id: string; deviceId: string; message: string }) =>
      api.post(`/broadcast/${id}/start`, { deviceId, content: message, messageType: 'TEXT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      toast.success('Broadcast mulai dijalankan!');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal memulai'),
  });

  const handleCsvChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setCsvFile(file);

    if (!file) {
      setCsvPhones([]);
      return;
    }

    const text = await file.text();
    const phones = parseCsvContacts(text);
    setCsvPhones(phones);

    if (phones.length === 0) {
      toast.error("CSV harus memiliki kolom 'phone' dan minimal satu data");
    }
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setCurrentStep(1);
    setCsvFile(null);
    setCsvPhones([]);
    form.reset();
  };

  const canGoNext = () => {
    if (currentStep === 1) return !!form.watch('deviceId');
    if (currentStep === 2) return csvPhones.length > 0;
    if (currentStep === 3) return !!form.watch('message');
    return true;
  };

  // Stats for running jobs
  const runningJobs = broadcastJobs.filter((j) => j.status === 'RUNNING');
  const completedJobs = broadcastJobs.filter((j) => j.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('newBroadcast')}
        </Button>
      </div>

      {/* Summary Stats */}
      {broadcastJobs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Siaran</p>
                <p className="text-2xl font-bold">{broadcastJobs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selesai</p>
                <p className="text-2xl font-bold">{completedJobs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-blue-500/10 p-3">
                <Play className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Berjalan</p>
                <p className="text-2xl font-bold">{runningJobs.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jobs List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="mb-2 h-5 w-48 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : broadcastJobs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20">
          <div className="rounded-full bg-muted p-4 mb-4">
            <MessagesSquare className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">{t('noBroadcast')}</h3>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            Buat siaran pertama untuk mengirim pesan massal ke banyak kontak.
          </p>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newBroadcast')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {broadcastJobs.map((job) => {
            const total = job._count?.recipients ?? 0;
            const processed = job.sentCount + job.failCount;
            const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
            const isRunning = job.status === 'RUNNING';

            return (
              <Card key={job.id} className={cn(isRunning && 'border-primary/40')}>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{job.name}</CardTitle>
                      {isRunning && (
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute h-2 w-2 rounded-full bg-primary opacity-75" />
                          <span className="relative h-2 w-2 rounded-full bg-primary" />
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(job.createdAt), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                    </p>
                  </div>
                  <Badge variant={statusColors[job.status] ?? 'secondary'}>
                    {statusLabels[job.status] ?? job.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {t('total')}: <strong>{total}</strong>
                      </span>
                      <span className="text-green-600">
                        {t('sent')}: <strong>{job.sentCount}</strong>
                      </span>
                      <span className="text-destructive">
                        {t('failed')}: <strong>{job.failCount}</strong>
                      </span>
                      {isRunning && (
                        <span className="text-muted-foreground">
                          Menunggu: <strong>{total - processed}</strong>
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">{progress}% selesai</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {isRunning && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setStopJobId(job.id)}
                        >
                          <Square className="mr-2 h-3 w-3" />
                          {t('stop')}
                        </Button>
                      )}
                      {job.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            startDraftMutation.mutate({
                              id: job.id,
                              deviceId: connectedDevices[0]?.id ?? '',
                              message: 'Pesan dari draf',
                            })
                          }
                          disabled={startDraftMutation.isPending}
                        >
                          <Play className="mr-2 h-3 w-3" />
                          {t('start')}
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

      {/* ===================== BROADCAST WIZARD ===================== */}
      <Dialog open={wizardOpen} onOpenChange={(open) => !open && closeWizard()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('newBroadcast')}</DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-1 mb-6">
            {WIZARD_STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    'flex items-center gap-2 flex-1',
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-full flex items-center justify-center h-8 w-8 text-sm font-bold shrink-0 border-2 transition-all',
                      currentStep > step.id
                        ? 'bg-primary border-primary text-primary-foreground'
                        : currentStep === step.id
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                    )}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-xs hidden sm:block">{step.label}</span>
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className={cn('h-px flex-1 mx-2', currentStep > step.id ? 'bg-primary' : 'bg-muted')} />
                )}
              </div>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
              {/* Step 1: Select Device */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Pilih Perangkat WhatsApp</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pilih perangkat yang akan digunakan untuk mengirim siaran.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('campaignName')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Promo Ramadan 2026" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perangkat Pengirim</FormLabel>
                        {connectedDevices.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-6 text-center">
                            <MessagesSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Tidak ada perangkat yang terhubung.
                              <br />Pastikan perangkat WhatsApp sudah terhubung.
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {connectedDevices.map((device) => (
                              <div
                                key={device.id}
                                onClick={() => field.onChange(device.id)}
                                className={cn(
                                  'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                                  field.value === device.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                )}
                              >
                                <div className="rounded-full bg-green-500/10 p-2">
                                  <MessagesSquare className="h-4 w-4 text-green-500" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{device.name}</p>
                                  {device.phone && (
                                    <p className="text-xs text-muted-foreground">{device.phone}</p>
                                  )}
                                </div>
                                {field.value === device.id && (
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Upload Contacts */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{t('uploadCSV')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload file CSV dengan kolom <code className="bg-muted px-1 rounded">phone</code> untuk daftar penerima.
                    </p>
                  </div>

                  <div
                    className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all hover:border-primary hover:bg-primary/5"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    {csvFile ? (
                      <>
                        <p className="font-medium">{csvFile.name}</p>
                        <p className="text-sm text-primary mt-1">{csvPhones.length} nomor ditemukan</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{t('uploadCSVDesc')}</p>
                        <p className="text-sm text-muted-foreground mt-1">Klik untuk browse file</p>
                      </>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvChange}
                    />
                  </div>

                  {csvPhones.length > 0 && (
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="p-4">
                        <p className="font-medium text-sm text-green-700 dark:text-green-400">
                          ✓ {csvPhones.length} nomor berhasil dibaca
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Preview: {csvPhones.slice(0, 5).join(', ')}
                          {csvPhones.length > 5 ? ` dan ${csvPhones.length - 5} lainnya` : ''}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="font-medium mb-2">Format CSV yang benar:</p>
                    <pre className="text-xs text-muted-foreground font-mono bg-background rounded p-2">
                      {'name,phone\nBudi,6281234567890\nSiti,6281234567891'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Step 3: Write Message */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Tulis Pesan</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tulis pesan yang akan dikirimkan ke {csvPhones.length} penerima.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('message')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Halo, kami memiliki penawaran spesial untuk Anda! 🎉"
                            className="min-h-[160px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground text-right">
                          {field.value?.length ?? 0} karakter
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduleAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" /> {t('schedule')} (opsional)
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Kosongkan untuk langsung dikirim setelah dibuat.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 4: Confirm */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">Konfirmasi & Kirim</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Periksa kembali detail siaran sebelum dikirimkan.
                    </p>
                  </div>

                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Nama Kampanye</span>
                        <span className="font-medium">{form.watch('name')}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Perangkat</span>
                        <span className="font-medium">{selectedDevice?.name ?? '—'}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Penerima</span>
                        <span className="font-medium text-primary">{csvPhones.length} nomor</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mode Kirim</span>
                        <span className="font-medium">
                          {form.watch('scheduleAt')
                            ? `Terjadwal — ${form.watch('scheduleAt')}`
                            : 'Mulai sekarang'}
                        </span>
                      </div>
                      <Separator />
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">Preview Pesan:</p>
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                          {form.watch('message') || '—'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">⚠️ Perhatian Anti-Ban</p>
                    <p className="text-muted-foreground mt-1">
                      Sistem akan mengirim dengan delay random 2–10 detik antar pesan untuk menghindari pemblokiran.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={currentStep === 1 ? closeWizard : () => setCurrentStep((s) => s - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {currentStep === 1 ? 'Batal' : 'Kembali'}
                </Button>

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    disabled={!canGoNext()}
                    onClick={() => setCurrentStep((s) => s + 1)}
                  >
                    Lanjut
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={createMutation.isPending || csvPhones.length === 0}>
                    {createMutation.isPending ? (
                      'Membuat siaran...'
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        {form.watch('scheduleAt') ? 'Simpan & Jadwalkan' : 'Kirim Sekarang'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Stop Confirmation */}
      <AlertDialog open={!!stopJobId} onOpenChange={(open) => !open && setStopJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hentikan Broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              Broadcast yang sedang berjalan akan dihentikan. Pesan yang sudah terkirim tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => stopJobId && stopMutation.mutate(stopJobId)}
              disabled={stopMutation.isPending}
            >
              {stopMutation.isPending ? 'Menghentikan...' : 'Ya, Hentikan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
