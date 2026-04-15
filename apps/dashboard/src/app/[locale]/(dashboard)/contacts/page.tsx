"use client";

import { type ChangeEvent, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api, { apiGetData } from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Upload, Users } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  notes: z.string().optional(),
});

interface Contact {
  id: string;
  name: string;
  phone: string;
  notes: string | null;
}

export default function ContactsPage() {
  const t = useTranslations('Contacts');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => apiGetData<Contact[]>('/contacts'),
  });

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof contactSchema>) => api.post('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setAddOpen(false);
      addForm.reset();
      toast.success('Kontak berhasil ditambahkan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof contactSchema> }) =>
      api.put(`/contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setEditContact(null);
      toast.success('Kontak berhasil diperbarui');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const importMutation = useMutation({
    mutationFn: (contactsToImport: Array<z.infer<typeof contactSchema>>) =>
      api.post('/contacts/import', { contacts: contactsToImport }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      const created = response.data?.data?.created ?? 0;
      const skipped = response.data?.data?.skipped ?? 0;
      toast.success(`Import selesai: ${created} baru, ${skipped} duplikat dilewati`);
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Gagal import kontak'),
  });

  const addForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', phone: '', notes: '' },
  });

  const editForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
  });

  const openEdit = (contact: Contact) => {
    setEditContact(contact);
    editForm.reset({ name: contact.name, phone: contact.phone, notes: contact.notes ?? '' });
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length <= 1) {
      toast.error('File CSV kosong atau tidak valid');
      event.target.value = '';
      return;
    }

    const headers = rows[0].split(',').map((header) => header.trim().toLowerCase());
    const nameIndex = headers.indexOf('name');
    const phoneIndex = headers.indexOf('phone');
    const notesIndex = headers.indexOf('notes');

    if (nameIndex === -1 || phoneIndex === -1) {
      toast.error("CSV wajib punya kolom 'name' dan 'phone'");
      event.target.value = '';
      return;
    }

    const parsedContacts = rows.slice(1)
      .map((row) => row.split(',').map((value) => value.trim()))
      .map((columns) => ({
        name: columns[nameIndex] || '',
        phone: columns[phoneIndex] || '',
        notes: notesIndex >= 0 ? columns[notesIndex] || '' : '',
      }))
      .filter((contact) => contact.name && contact.phone);

    if (parsedContacts.length === 0) {
      toast.error('Tidak ada kontak valid untuk diimport');
      event.target.value = '';
      return;
    }

    importMutation.mutate(parsedContacts);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('addContact')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('addContact')}</DialogTitle></DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
                  <FormField control={addForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('name')}</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel>
                      <FormControl><Input placeholder="628123456789" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addForm.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('notes')}</FormLabel>
                      <FormControl><Input placeholder="Catatan opsional..." {...field} /></FormControl>
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
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {t('importCSV')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">{filtered.length} kontak</span>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6">
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('noContacts')}</h3>
          <p className="text-sm text-muted-foreground">{t('noContactsDesc')}</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead>{t('notes')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.notes ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(contact)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(contact.id)}>
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

      {/* Edit Dialog */}
      <Dialog open={!!editContact} onOpenChange={(open) => !open && setEditContact(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Kontak</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((v) => editContact && updateMutation.mutate({ id: editContact.id, data: v }))} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('phone')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('notes')}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? '...' : 'Perbarui'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
