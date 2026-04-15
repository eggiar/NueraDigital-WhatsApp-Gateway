"use client";

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Mail, BrainCircuit, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface SystemConfig {
  key: string;
  value: string;
  description: string;
}

const CONFIG_GROUPS = [
  {
    id: 'smtp',
    label: 'SMTP Email',
    icon: Mail,
    keys: [
      { key: 'SMTP_HOST', label: 'Host', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'SMTP_PORT', label: 'Port', type: 'number', placeholder: '587' },
      { key: 'SMTP_USER', label: 'Username', type: 'text', placeholder: 'noreply@domain.com' },
      { key: 'SMTP_PASS', label: 'Password', type: 'password', placeholder: '••••••••' },
      { key: 'SMTP_FROM_NAME', label: 'From Name', type: 'text', placeholder: 'NueraDigital' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Internal',
    icon: BrainCircuit,
    keys: [
      { key: 'AI_INTERNAL_PROVIDER', label: 'Provider', type: 'text', placeholder: 'openai / gemini / openrouter' },
      { key: 'AI_INTERNAL_API_KEY', label: 'API Key', type: 'password', placeholder: '••••••••' },
      { key: 'AI_INTERNAL_MODEL', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini' },
    ],
  },
];

export default function AdminSystemPage() {
  const t = useTranslations('Admin');
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [maintenance, setMaintenance] = useState(false);

  const { data: systemConfigs = [] } = useQuery<SystemConfig[]>({
    queryKey: ['system-configs'],
    queryFn: async () => {
      const data = await apiGetData<SystemConfig[]>('/admin/system-config');
      const map: Record<string, string> = {};
      data.forEach(c => { map[c.key] = c.value; });
      setConfigs(map);
      setMaintenance(map['MAINTENANCE_MODE'] === 'true');
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.put('/admin/system-config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] });
      toast.success('Konfigurasi berhasil disimpan');
    },
    onError: () => toast.error('Gagal menyimpan konfigurasi'),
  });

  const handleSave = (group: string) => {
    const groupConfig = CONFIG_GROUPS.find(g => g.id === group);
    if (!groupConfig) return;
    const updates: Record<string, string> = {};
    groupConfig.keys.forEach(k => {
      if (configs[k.key] !== undefined) updates[k.key] = configs[k.key];
    });
    updateMutation.mutate(updates);
  };

  const toggleMaintenance = (v: boolean) => {
    setMaintenance(v);
    updateMutation.mutate({ MAINTENANCE_MODE: v ? 'true' : 'false' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('system')}</h2>
        <p className="text-muted-foreground">Konfigurasi sistem global untuk seluruh platform.</p>
      </div>

      <div className="max-w-2xl">
        <Tabs defaultValue="smtp">
          <TabsList>
            {CONFIG_GROUPS.map(g => (
              <TabsTrigger key={g.id} value={g.id}>
                <g.icon className="mr-2 h-4 w-4" />
                {g.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="maintenance">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          {CONFIG_GROUPS.map(group => (
            <TabsContent key={group.id} value={group.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <group.icon className="h-5 w-5" />
                    Konfigurasi {group.label}
                  </CardTitle>
                  <CardDescription>
                    {group.id === 'smtp'
                      ? 'Konfigurasi SMTP untuk pengiriman email (registrasi, invoice, notifikasi).'
                      : 'Provider AI internal yang bisa digunakan user tanpa memasukkan API key sendiri.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.keys.map(cfg => (
                    <div key={cfg.key} className="space-y-2">
                      <Label htmlFor={cfg.key}>{cfg.label}</Label>
                      <Input
                        id={cfg.key}
                        type={cfg.type}
                        placeholder={cfg.placeholder}
                        value={configs[cfg.key] ?? ''}
                        onChange={(e) => setConfigs(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <Separator />
                  <Button
                    onClick={() => handleSave(group.id)}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Mode Maintenance
                </CardTitle>
                <CardDescription>
                  Saat aktif, semua pengguna akan melihat halaman maintenance. Admin masih bisa mengakses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t('maintenance')}</p>
                    <p className="text-sm text-muted-foreground">
                      Status saat ini: {maintenance ? '🔴 Aktif' : '🟢 Normal'}
                    </p>
                  </div>
                  <Switch
                    checked={maintenance}
                    onCheckedChange={toggleMaintenance}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
