"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Bot } from 'lucide-react';

const ruleSchema = z.object({
  keyword: z.string().min(1),
  response: z.string().min(1),
  matchType: z.enum(['exact', 'contains', 'startsWith']),
  isAI: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

interface AutoReplyRule {
  id: string;
  keyword: string;
  response: string;
  matchType: string;
  isAI: boolean;
  isActive: boolean;
}

export default function AutoReplyPage() {
  const t = useTranslations('AutoReply');
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutoReplyRule | null>(null);

  const { data: rules = [], isLoading } = useQuery<AutoReplyRule[]>({
    queryKey: ['auto-reply'],
    queryFn: async () => (await api.get('/auto-reply')).data,
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof ruleSchema>) => api.post('/auto-reply', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply'] });
      setAddOpen(false);
      addForm.reset();
      toast.success('Aturan berhasil ditambahkan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof ruleSchema> }) =>
      api.put(`/auto-reply/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply'] });
      setEditRule(null);
      toast.success('Aturan berhasil diperbarui');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auto-reply/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto-reply'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/auto-reply/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto-reply'] }),
  });

  const addForm = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { keyword: '', response: '', matchType: 'contains', isAI: false, isActive: true },
  });

  const editForm = useForm<z.infer<typeof ruleSchema>>({
    resolver: zodResolver(ruleSchema),
  });

  const openEdit = (rule: AutoReplyRule) => {
    setEditRule(rule);
    editForm.reset({
      keyword: rule.keyword,
      response: rule.response,
      matchType: rule.matchType as any,
      isAI: rule.isAI,
      isActive: rule.isActive,
    });
  };

  const RuleForm = ({ form, onSubmit, loading }: any) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="keyword" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('keyword')}</FormLabel>
            <FormControl><Input placeholder="harga, info, bantuan" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="matchType" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('matchType')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="contains">{t('contains')}</SelectItem>
                <SelectItem value="exact">{t('exact')}</SelectItem>
                <SelectItem value="startsWith">{t('startsWith')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="response" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('response')}</FormLabel>
            <FormControl>
              <Textarea placeholder="Halo! Silakan hubungi kami di..." className="min-h-[80px]" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="isAI" render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <FormLabel className="text-base">{t('aiMode')}</FormLabel>
              <p className="text-xs text-muted-foreground">Gunakan AI untuk generate respons</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )} />
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
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />{t('addRule')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('addRule')}</DialogTitle></DialogHeader>
            <RuleForm
              form={addForm}
              onSubmit={(v: z.infer<typeof ruleSchema>) => createMutation.mutate(v)}
              loading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6">
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
          </div>
        </CardContent></Card>
      ) : rules.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('noRules')}</h3>
          <p className="text-sm text-muted-foreground">{t('noRulesDesc')}</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('keyword')}</TableHead>
                <TableHead>{t('matchType')}</TableHead>
                <TableHead>{t('response')}</TableHead>
                <TableHead>{t('aiMode')}</TableHead>
                <TableHead>{t('active')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.keyword}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rule.matchType}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {rule.response}
                  </TableCell>
                  <TableCell>
                    {rule.isAI ? <Badge>AI</Badge> : <span className="text-muted-foreground text-xs">Manual</span>}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, isActive: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(rule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!editRule} onOpenChange={(open) => !open && setEditRule(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Aturan</DialogTitle></DialogHeader>
          <RuleForm
            form={editForm}
            onSubmit={(v: z.infer<typeof ruleSchema>) => editRule && updateMutation.mutate({ id: editRule.id, data: v })}
            loading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
