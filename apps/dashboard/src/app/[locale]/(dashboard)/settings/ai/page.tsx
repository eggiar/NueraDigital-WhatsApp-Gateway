"use client";

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, CheckCircle } from 'lucide-react';

const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'openrouter', 'gemini']),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
});

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  openrouter: ['openai/gpt-4o', 'anthropic/claude-3-haiku', 'google/gemini-flash-1.5', 'meta-llama/llama-3.2-3b-instruct:free'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
};

const PROVIDER_INFO: Record<string, { name: string; desc: string; freeNote?: string }> = {
  openai: { name: 'OpenAI', desc: 'GPT-4o, GPT-3.5 — Performa terbaik' },
  openrouter: { name: 'OpenRouter', desc: 'Akses 100+ model AI — Ada pilihan gratis', freeNote: 'Ada model gratis!' },
  gemini: { name: 'Google Gemini', desc: 'Model Google — Gratis tier tersedia', freeNote: 'Gratis hingga limit tertentu' },
};

interface AIConfig {
  id?: string;
  provider: string;
  model: string;
  systemPrompt?: string;
}

export default function AISettingsPage() {
  const t = useTranslations('AISettings');
  const queryClient = useQueryClient();

  const { data: config } = useQuery<AIConfig>({
    queryKey: ['ai-config'],
    queryFn: async () => (await api.get('/ai-config')).data,
  });

  const saveMutation = useMutation({
    mutationFn: (data: z.infer<typeof aiConfigSchema>) => api.put('/ai-config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-config'] });
      toast.success('Konfigurasi AI berhasil disimpan');
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Gagal menyimpan'),
  });

  const testMutation = useMutation({
    mutationFn: () => api.post('/ai-config/test'),
    onSuccess: () => toast.success('Koneksi AI berhasil!'),
    onError: () => toast.error('Koneksi AI gagal. Periksa API key Anda.'),
  });

  const form = useForm<z.infer<typeof aiConfigSchema>>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      provider: (config?.provider as any) || 'gemini',
      apiKey: '',
      model: config?.model || 'gemini-1.5-flash',
      systemPrompt: config?.systemPrompt || 'Kamu adalah asisten customer service yang ramah dan membantu.',
    },
  });

  const selectedProvider = form.watch('provider');
  const models = MODEL_OPTIONS[selectedProvider] || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="max-w-2xl">
        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Konfigurasi</TabsTrigger>
            <TabsTrigger value="providers">Panduan Provider</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Pengaturan AI Auto-Reply</CardTitle>
                    <CardDescription>
                      {config?.provider ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          {t('connected')} — {config.provider} / {config.model}
                        </span>
                      ) : t('notConfigured')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
                    <FormField control={form.control} name="provider" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('provider')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  {info.name}
                                  {info.freeNote && (
                                    <Badge variant="secondary" className="text-xs py-0">{info.freeNote}</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedProvider && (
                          <p className="text-xs text-muted-foreground">{PROVIDER_INFO[selectedProvider].desc}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="apiKey" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('apiKey')}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={`Masukkan ${PROVIDER_INFO[selectedProvider]?.name || ''} API Key`}
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">API key tidak akan ditampilkan setelah disimpan</p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="model" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('model')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {models.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="systemPrompt" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('systemPrompt')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('systemPromptPlaceholder')}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex gap-2">
                      <Button type="submit" disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? '...' : t('save')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
                        {testMutation.isPending ? '...' : t('testConnection')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            {Object.entries(PROVIDER_INFO).map(([key, info]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-base">{info.name}</CardTitle>
                  <CardDescription>{info.desc}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Model tersedia: {MODEL_OPTIONS[key].join(', ')}</p>
                  {info.freeNote && (
                    <Badge variant="secondary" className="mt-2">{info.freeNote}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
