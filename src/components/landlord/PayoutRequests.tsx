import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, DollarSign, Clock, CheckCircle, XCircle, Smartphone, TrendingUp } from 'lucide-react';

interface PayoutRequest {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  phone_number: string;
  requested_at: string;
  processed_at?: string;
  transaction_id?: string;
}

const PayoutRequests: React.FC = () => {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRequestPayout, setShowRequestPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    phoneNumber: '',
  });
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchPayoutData = async () => {
    if (!profile?.user_id) return;

    try {
      // Calculate available balance from completed payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          amount,
          status,
          tenancies!payments_tenancy_id_fkey (
            units!tenancies_unit_id_fkey (
              properties!units_property_id_fkey (
                landlord_id
              )
            )
          )
        `)
        .eq('tenancies.units.properties.landlord_id', profile.user_id)
        .eq('status', 'completed');

      if (paymentsError) throw paymentsError;

      const totalPayments = (paymentsData || []).reduce((sum, payment) => sum + Number(payment.amount), 0);

      // For demo purposes, we'll simulate payout requests in localStorage
      // In real scenario, this would be stored in Supabase
      const storedPayouts = localStorage.getItem(`payouts_${profile.user_id}`);
      const payoutRequests = storedPayouts ? JSON.parse(storedPayouts) : [];
      
      const totalPayouts = payoutRequests
        .filter((p: PayoutRequest) => p.status === 'completed')
        .reduce((sum: number, p: PayoutRequest) => sum + p.amount, 0);

      const balance = totalPayments - totalPayouts;
      
      setAvailableBalance(balance);
      setPayouts(payoutRequests);
    } catch (error: any) {
      toast({
        title: 'Error loading payout data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutData();
  }, [profile?.user_id]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = Number(payoutForm.amount);
    if (amount > availableBalance) {
      toast({
        title: 'Insufficient balance',
        description: 'Requested amount exceeds available balance.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newPayout: PayoutRequest = {
        id: Date.now().toString(),
        amount,
        status: 'pending',
        phone_number: payoutForm.phoneNumber,
        requested_at: new Date().toISOString(),
      };

      // In real scenario, this would be stored in Supabase
      const existingPayouts = localStorage.getItem(`payouts_${profile?.user_id}`);
      const payouts = existingPayouts ? JSON.parse(existingPayouts) : [];
      payouts.unshift(newPayout);
      localStorage.setItem(`payouts_${profile?.user_id}`, JSON.stringify(payouts));

      // TODO: Integrate with MTN MoMo Disbursements API here
      // For now, we'll simulate the process
      
      toast({
        title: 'Payout requested',
        description: `Your payout request for $${amount.toLocaleString()} has been submitted.`,
      });

      setShowRequestPayout(false);
      setPayoutForm({ amount: '', phoneNumber: '' });
      fetchPayoutData();
    } catch (error: any) {
      toast({
        title: 'Error requesting payout',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <TrendingUp className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Available Balance
              </CardTitle>
              <CardDescription>Available for withdrawal via MTN MoMo</CardDescription>
            </div>
            <Dialog open={showRequestPayout} onOpenChange={setShowRequestPayout}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center gap-2" 
                  disabled={availableBalance <= 0}
                >
                  <Plus className="h-4 w-4" />
                  Request Payout
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                  <DialogDescription>
                    Withdraw your earnings to your MTN MoMo account
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRequestPayout} className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Available Balance</span>
                      <span className="text-lg font-bold">${availableBalance.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payout Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      max={availableBalance}
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum: ${availableBalance.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">MTN MoMo Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={payoutForm.phoneNumber}
                      onChange={(e) => setPayoutForm({ ...payoutForm, phoneNumber: e.target.value })}
                      placeholder="256 XXX XXX XXX"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your registered MTN MoMo number
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Smartphone className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-100">Payout Processing</p>
                        <p className="text-blue-700 dark:text-blue-300">
                          Payouts are typically processed within 24 hours. You'll receive an SMS confirmation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      Request ${Number(payoutForm.amount || 0).toLocaleString()}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowRequestPayout(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="text-3xl font-bold text-green-600 mb-2">
            ${availableBalance.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">
            Collected from rent payments
          </p>
          {availableBalance <= 0 && (
            <p className="text-sm text-orange-600 mt-2">
              No funds available for withdrawal. Start collecting rent to build your balance.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Track your withdrawal requests and their status</CardDescription>
        </CardHeader>
        
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No payout requests yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Request your first payout when you have available balance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">${payout.amount.toLocaleString()}</h4>
                        <Badge 
                          variant={getStatusColor(payout.status)} 
                          className="flex items-center gap-1"
                        >
                          {getStatusIcon(payout.status)}
                          <span className="capitalize">{payout.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span>Phone:</span>
                          <span className="font-medium ml-1">{payout.phone_number}</span>
                        </div>
                        <div>
                          <span>Requested:</span>
                          <span className="font-medium ml-1">
                            {new Date(payout.requested_at).toLocaleDateString()}
                          </span>
                        </div>
                        {payout.processed_at && (
                          <div>
                            <span>Processed:</span>
                            <span className="font-medium ml-1">
                              {new Date(payout.processed_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {payout.transaction_id && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Transaction ID:</span>
                          <span className="font-mono ml-1">{payout.transaction_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutRequests;