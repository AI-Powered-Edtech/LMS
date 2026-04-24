import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Badge } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// This relies on Midtrans Snap.js being loaded in index.html
// <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="YOUR_CLIENT_KEY"></script>

export function ParentPortal() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const addToast = useToast((state) => state.addToast);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const fetchInvoices = async () => {
    if (!user || !session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/data/spp_invoices?student_id=eq.${user.id}&order=created_at.desc`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data || []);
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', message: t('common.error'), description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (invoiceId: string) => {
    if (!session) return;
    try {
      // 1. Create payment transaction via our API
      const res = await fetch('/api/v1/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ invoice_id: invoiceId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      // 2. Open Midtrans Snap UI
      if ((window as any).snap) {
        (window as any).snap.pay(data.snap_token, {
          onSuccess: function(_result: any) {
            addToast({ type: 'success', message: 'Payment Success', description: 'Your payment was successful!' });
            fetchInvoices();
          },
          onPending: function(_result: any) {
            addToast({ type: 'info', message: 'Payment Pending', description: 'Please complete your payment.' });
          },
          onError: function(_result: any) {
            addToast({ type: 'error', message: 'Payment Failed', description: 'Your payment failed.' });
          },
          onClose: function() {
            addToast({ type: 'warning', message: 'Payment Cancelled', description: 'You closed the payment popup without finishing.' });
          }
        });
      } else {
        addToast({ type: 'error', message: 'Error', description: 'Payment gateway not loaded.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', message: t('common.error'), description: err.message });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">{t('parent_portal.title', 'Portal Orang Tua & Tagihan')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invoices.length === 0 ? (
          <p className="text-muted-foreground">{t('parent_portal.no_invoices', 'Tidak ada tagihan saat ini.')}</p>
        ) : (
          invoices.map((inv) => (
            <Card key={inv.id} className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-lg">SPP {new Date(inv.billing_month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'UNPAID' ? 'danger' : 'neutral'}>
                  {inv.status}
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-bold">Rp {Number(inv.amount).toLocaleString('id-ID')}</p>
                <p className="text-sm text-muted-foreground">Jatuh Tempo: {new Date(inv.due_date).toLocaleDateString('id-ID')}</p>
              </div>
              <div className="mt-4">
                {inv.status !== 'PAID' && (
                  <Button className="w-full" onClick={() => handlePay(inv.id)}>
                    Bayar Sekarang
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
