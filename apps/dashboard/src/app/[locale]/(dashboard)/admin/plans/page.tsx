"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

const planSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  deviceLimit: z.coerce.number().min(1),
  msgLimit: z.coerce.number().min(1),
  features: z.string().optional(),
  isActive: z.boolean().default(true),
});

interface Plan {
  id: string;
  name: string;
  price: number;
  deviceLimit: number;
  msgLimit: number;
  features: any;
  isActive: boolean;
}

export default function AdminPlansPage() {
  const t = useTranslations('Admin');
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['admin-plans'],
    queryFn: async () => apiGetData<Plan[]>('/plans'),
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof planSchema>) => api.post('/plans', {
      ...data,
      features: data.features ? JSON.parse(data.features) : [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setAddOpen(false);
      addForm.reset();
      toast.success('Paket berhasil ditambahkan');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Gagal'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof planSchema> }) =>
      api.put(`/plans/${id}`, {
        ...data,
        features: data.features ? JSON.parse(data.features) : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setEditPlan(null);
      toast.success('Paket berhasil diperbarui');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-plans'] }),
  });

  const addForm = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: { name: '', price: 0, deviceLimit: 5, msgLimit: 1000, features: '[]' },
  });

  const editForm = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
  });

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    editForm.reset({
      name: plan.name,
      price: plan.price,
      deviceLimit: plan.deviceLimit,
      msgLimit: plan.msgLimit,
      features: JSON.stringify(plan.features ?? []),
    });
  };

  const PlanForm = ({ form, onSubmit, loading }: any) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>{t('planName')}</FormLabel>
              <FormControl><Input placeholder="Starter / Pro / Enterprise" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('price')} (Rp/bulan)</FormLabel>
              <FormControl><Input type="number" placeholder="99000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="deviceLimit" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('deviceLimit')}</FormLabel>
              <FormControl><Input type="number" placeholder="5" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="msgLimit" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('msgLimit')}</FormLabel>
              <FormControl><Input type="number" placeholder="10000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="features" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Fitur (JSON array)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='["Kirim pesan", "Broadcast", "Auto-reply"]'
                  className="font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>{loading ? '...' : 'Simpan'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('plans')}</h2>
          <p className="text-muted-foreground">Kelola paket harga yang tersedia untuk pelanggan.</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />{t('addPlan')}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{t('addPlan')}</DialogTitle></DialogHeader>
            <PlanForm
              form={addForm}
              onSubmit={(v: z.infer<typeof planSchema>) => createMutation.mutate(v)}
              loading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>)}
        </div>
      ) : plans.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Tag className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Belum ada paket harga. Tambahkan paket baru.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-2xl font-bold mt-1">
                    {plan.price === 0 ? 'Gratis' : `Rp ${plan.price.toLocaleString('id-ID')}`}
                    {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/bln</span>}
                  </p>
                </div>
                {!plan.isActive && <Badge variant="secondary">Nonaktif</Badge>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    📱 {plan.deviceLimit} perangkat max
                  </p>
                  <p className="text-muted-foreground">
                    💬 {plan.msgLimit.toLocaleString()} pesan/bulan
                  </p>
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="space-y-1">
                    {plan.features.map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground">✓ {f}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(plan)}>
                    <Pencil className="mr-2 h-3 w-3" />Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(plan.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Paket</DialogTitle></DialogHeader>
          <PlanForm
            form={editForm}
            onSubmit={(v: z.infer<typeof planSchema>) => editPlan && updateMutation.mutate({ id: editPlan.id, data: v })}
            loading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
