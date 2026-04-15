"use client";

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, Key, User, Lock } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

interface ApiKey {
  id: string;
  key: string;
  lastUsed: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const { user, setAuth } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => apiGetData<ApiKey[]>('/auth/api-keys'),
  });

  const profileMutation = useMutation({
    mutationFn: (data: z.infer<typeof profileSchema>) => api.put('/auth/profile', data),
    onSuccess: (res) => {
      toast.success('Profil berhasil diperbarui');
      setAuth(res.data.data, localStorage.getItem('token')!);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: z.infer<typeof passwordSchema>) => api.put('/auth/password', data),
    onSuccess: () => {
      toast.success('Kata sandi berhasil diubah');
      passwordForm.reset();
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Gagal mengubah kata sandi'),
  });

  const generateKeyMutation = useMutation({
    mutationFn: () => api.post('/auth/api-keys'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/api-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '' },
  });

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="max-w-2xl">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />Profil
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="mr-2 h-4 w-4" />Keamanan
            </TabsTrigger>
            <TabsTrigger value="api-keys">
              <Key className="mr-2 h-4 w-4" />API Key
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Profil</CardTitle>
                <CardDescription>Perbarui nama dan email akun Anda.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))} className="space-y-4">
                    <FormField control={profileForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('name')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('email')}</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Role:</span>
                      <Badge>{user?.roles?.[0] ?? 'user'}</Badge>
                    </div>
                    <Button type="submit" disabled={profileMutation.isPending}>
                      {profileMutation.isPending ? '...' : t('save')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('changePassword')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))} className="space-y-4">
                    <FormField control={passwordForm.control} name="oldPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('oldPassword')}</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('newPassword')}</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={passwordMutation.isPending}>
                      {passwordMutation.isPending ? '...' : 'Ganti Kata Sandi'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{t('apiKey')}</CardTitle>
                  <CardDescription>Gunakan API key untuk akses programatik ke API Gateway.</CardDescription>
                </div>
                <Button size="sm" onClick={() => generateKeyMutation.mutate()} disabled={generateKeyMutation.isPending}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('generateKey')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada API key. Klik "Generate Key Baru" untuk membuat.</p>
                ) : (
                  apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <code className="flex-1 text-xs font-mono text-muted-foreground truncate">
                        {key.key}
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => copyKey(key.key)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteKeyMutation.mutate(key.id)}>
                        <span className="text-destructive text-xs">Hapus</span>
                      </Button>
                    </div>
                  ))
                )}
                {copied && <p className="text-xs text-green-600">API Key disalin!</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
