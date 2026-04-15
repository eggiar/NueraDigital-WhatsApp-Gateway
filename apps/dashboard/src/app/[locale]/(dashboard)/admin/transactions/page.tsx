"use client";

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiGetData } from '@/lib/api';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Receipt } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  midtransOrderId: string | null;
  createdAt: string;
  user: { name: string; email: string };
  plan: { name: string };
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  SETTLEMENT: 'default',
  PAID: 'default',
  PENDING: 'secondary',
  FAILED: 'destructive',
  EXPIRED: 'destructive',
};

export default function AdminTransactionsPage() {
  const t = useTranslations('Admin');

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['admin-transactions'],
    queryFn: async () => apiGetData<Transaction[]>('/admin/transactions'),
  });

  const totalRevenue = transactions
    .filter(t => t.status === 'settlement' || t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('transactions')}</h2>
          <p className="text-muted-foreground">Semua transaksi pembayaran yang masuk.</p>
        </div>
        <Card className="px-6 py-4">
          <p className="text-sm text-muted-foreground">{t('revenue')}</p>
          <p className="text-2xl font-bold text-green-600">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </p>
        </Card>
      </div>

      {isLoading ? (
        <Card>
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
          </div>
        </Card>
      ) : transactions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Belum ada transaksi.</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tx.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{tx.user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{tx.plan?.name}</TableCell>
                  <TableCell className="font-medium">
                    Rp {tx.amount.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[tx.status] ?? 'secondary'}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {tx.midtransOrderId ?? '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(tx.createdAt), 'dd MMM yyyy', { locale: idLocale })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
