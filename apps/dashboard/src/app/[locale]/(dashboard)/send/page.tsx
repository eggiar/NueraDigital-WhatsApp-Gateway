"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send } from 'lucide-react';

const sendSchema = z.object({
  deviceId: z.string().min(1, 'Pilih perangkat'),
  to: z.string().min(6, 'Nomor tidak valid'),
  type: z.enum(['text', 'image', 'video', 'document']),
  message: z.string().optional(),
  mediaUrl: z.string().url().optional().or(z.literal('')),
  caption: z.string().optional(),
});

interface Device { id: string; name: string; status: string; }

export default function SendPage() {
  const t = useTranslations('Send');
  const [sendTo, setSendTo] = useState<'personal' | 'group'>('personal');

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => apiGetData<Device[]>('/devices'),
  });

  const connectedDevices = devices.filter((device) => device.status.toLowerCase() === 'connected');

  const sendMutation = useMutation({
    mutationFn: async (values: z.infer<typeof sendSchema>) => {
      const endpoint = sendTo === 'group' ? '/messages/send-group' : '/messages/send';
      if (values.type === 'text') {
        return api.post(endpoint, {
          deviceId: values.deviceId,
          to: values.to,
          message: values.message,
        });
      } else {
        return api.post('/messages/send-media', {
          deviceId: values.deviceId,
          to: values.to,
          type: values.type,
          mediaUrl: values.mediaUrl,
          caption: values.caption,
        });
      }
    },
    onSuccess: () => toast.success(t('success')),
    onError: (error: any) => toast.error(error.response?.data?.error || 'Gagal mengirim pesan'),
  });

  const form = useForm<z.infer<typeof sendSchema>>({
    resolver: zodResolver(sendSchema),
    defaultValues: { deviceId: '', to: '', type: 'text', message: '', mediaUrl: '', caption: '' },
  });

  const msgType = form.watch('type');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sendTo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={sendTo} onValueChange={(v) => setSendTo(v as 'personal' | 'group')}>
              <TabsList className="mb-4">
                <TabsTrigger value="personal">{t('personal')}</TabsTrigger>
                <TabsTrigger value="group">{t('group')}</TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => sendMutation.mutate(v))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="deviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('selectDevice')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectDevice')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {connectedDevices.length === 0 ? (
                              <SelectItem value="_none" disabled>Tidak ada perangkat terhubung</SelectItem>
                            ) : (
                              connectedDevices.map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {sendTo === 'group' ? 'Group JID' : t('recipient')}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder={sendTo === 'group' ? '120363XXXXXX@g.us' : t('recipientPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('messageType')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">{t('text')}</SelectItem>
                            <SelectItem value="image">{t('image')}</SelectItem>
                            <SelectItem value="video">{t('video')}</SelectItem>
                            <SelectItem value="document">{t('document')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {msgType === 'text' ? (
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('message')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t('messagePlaceholder')}
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="mediaUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('mediaUrl')}</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/file.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="caption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('caption')}</FormLabel>
                            <FormControl>
                              <Textarea placeholder={t('messagePlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <Button type="submit" className="w-full" disabled={sendMutation.isPending}>
                    <Send className="mr-2 h-4 w-4" />
                    {sendMutation.isPending ? t('sending') : t('send')}
                  </Button>
                </form>
              </Form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
