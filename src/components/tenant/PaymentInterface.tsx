import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { X, CreditCard, DollarSign, Calendar, Smartphone } from 'lucide-react';

interface PaymentInterfaceProps {
  tenancy: {
    id: string;
    rent_amount: number;
    units: {
      unit_number: string;
      properties: {
        name: string;
      };
    };
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentInterface: React.FC<PaymentInterfaceProps> = ({
  tenancy,
  onSuccess,
  onCancel,
}) => {
  const [amount, setAmount] = useState(tenancy.rent_amount.toString());
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'card' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id) return;

    setLoading(true);
    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            tenancy_id: tenancy.id,
            amount: Number(amount),
            payment_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            method: paymentMethod === 'momo' ? 'MTN MoMo' : 'Credit Card',
          },
        ]);

      if (paymentError) throw paymentError;

      // TODO: Integrate with MTN MoMo API here
      // For now, we'll simulate the payment process
      
      toast({
        title: 'Payment initiated',
        description: `Your payment of $${amount} has been submitted for processing.`,
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Payment failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pay Rent
            </CardTitle>
            <CardDescription>
              {tenancy.units.properties.name} - Unit {tenancy.units.unit_number}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handlePayment}>
          <CardContent className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Monthly Rent</span>
                <span className="font-bold">${Number(tenancy.rent_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date</span>
                <span className="text-sm">{new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="text-lg font-semibold"
              />
              <p className="text-sm text-muted-foreground">
                Minimum payment: ${Number(tenancy.rent_amount).toLocaleString()}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={paymentMethod === 'momo' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('momo')}
                  className="h-20 flex-col gap-2"
                >
                  <Smartphone className="h-6 w-6" />
                  <span className="text-xs">MTN MoMo</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className="h-20 flex-col gap-2"
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-xs">Credit Card</span>
                </Button>
              </div>
            </div>

            {/* MTN MoMo Phone Number */}
            {paymentMethod === 'momo' && (
              <div className="space-y-2">
                <Label htmlFor="phone">MTN MoMo Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="256 XXX XXX XXX"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter your MTN MoMo registered phone number
                </p>
              </div>
            )}

            {/* Payment Note */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex gap-2">
                <Calendar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Payment Processing</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    {paymentMethod === 'momo' 
                      ? 'You will receive an MTN MoMo prompt on your phone to complete the payment.'
                      : 'You will be redirected to secure payment processing.'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={loading || !paymentMethod || (paymentMethod === 'momo' && !phoneNumber)} 
                className="flex-1"
              >
                {loading ? 'Processing...' : `Pay $${Number(amount).toLocaleString()}`}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </form>
      </div>
    </Card>
  );
};

export default PaymentInterface;