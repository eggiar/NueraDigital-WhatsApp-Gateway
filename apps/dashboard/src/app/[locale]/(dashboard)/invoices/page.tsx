"use client";

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, FileX } from 'lucide-react';

interface Invoice {
  id: string;
  pdfUrl: string | null;
  paidAt: string | null;
  transaction: {
    plan: { name: string };
    amount: number;
    status: string;
  };
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  paid: 'default',
  settlement: 'default',
  pending: 'secondary',
  failed: 'destructive',
};

export default function InvoicesPage() {
  const t = useTranslations('Invoices');

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoices')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <Card>
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
          </div>
        </Card>
      ) : invoices.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FileX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('noInvoices')}</h3>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('plan')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    {invoice.paidAt
                      ? format(new Date(invoice.paidAt), 'dd MMM yyyy', { locale: idLocale })
                      : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{invoice.transaction.plan.name}</TableCell>
                  <TableCell>
                    Rp {invoice.transaction.amount.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.transaction.status] ?? 'secondary'}>
                      {t(invoice.transaction.status as any) ?? invoice.transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.pdfUrl ? (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          {t('download')}
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
