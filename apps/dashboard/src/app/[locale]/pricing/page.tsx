"use client";

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api, { apiGetData } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from '@/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  deviceLimit: number;
  msgLimit: number;
  features: string[];
}

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => apiGetData<Plan[]>('/plans'),
  });

  const handleCheckout = async (planId: string) => {
    if (!user) {
      router.push('/register');
      return;
    }

    try {
      const response = await api.post('/payment/create-transaction', { planId });
      const payment = response.data?.data;

      if (payment?.redirect_url) {
        window.location.href = payment.redirect_url;
        return;
      }

      router.push('/billing');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal memulai checkout');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="max-w-2xl space-y-3">
        <Badge variant="secondary">Pricing</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Pilih paket yang sesuai kebutuhan tim Anda</h1>
        <p className="text-muted-foreground">
          Paket dibaca langsung dari database dan siap dipakai untuk alur billing.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardContent className="h-80" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="border-2">
              <CardHeader className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-4xl font-bold">
                    {plan.price === 0 ? 'Gratis' : `Rp ${plan.price.toLocaleString('id-ID')}`}
                  </p>
                  <p className="text-sm text-muted-foreground">per bulan</p>
                </div>
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span>{plan.deviceLimit} device</span>
                  <span>|</span>
                  <span>{plan.msgLimit.toLocaleString('id-ID')} pesan</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {Array.isArray(plan.features) && plan.features.length > 0 ? (
                    plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Fitur paket belum diisi.</p>
                  )}
                </div>

                <Button className="w-full" onClick={() => handleCheckout(plan.id)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {user ? 'Pilih Paket' : 'Daftar untuk memilih paket'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
