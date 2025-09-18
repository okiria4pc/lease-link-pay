import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CreditCard, Wallet } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  available: boolean;
  popular?: boolean;
}

interface PaymentMethodsProps {
  amount: number;
  onPaymentSelect: (methodId: string) => void;
  className?: string;
}

const PaymentMethods = ({ amount, onPaymentSelect, className }: PaymentMethodsProps) => {
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'mtn-momo',
      name: 'MTN Mobile Money',
      description: 'Pay instantly with MTN MoMo',
      icon: Smartphone,
      available: true,
      popular: true,
    },
    {
      id: 'airtel-money',
      name: 'Airtel Money',
      description: 'Quick payment via Airtel',
      icon: Smartphone,
      available: true,
    },
    {
      id: 'card',
      name: 'Debit/Credit Card',
      description: 'Visa, Mastercard accepted',
      icon: CreditCard,
      available: true,
    },
    {
      id: 'bank-transfer',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: Wallet,
      available: false,
    },
  ];

  return (
    <div className={className}>
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Pay ${amount.toLocaleString()}</h3>
        <p className="text-sm text-muted-foreground">Choose your preferred payment method</p>
      </div>

      <div className="space-y-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          
          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !method.available ? 'opacity-50' : ''
              }`}
            >
              <CardContent className="p-4">
                <button
                  onClick={() => method.available && onPaymentSelect(method.id)}
                  disabled={!method.available}
                  className="w-full text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{method.name}</h4>
                        {method.popular && (
                          <Badge variant="secondary" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                    
                    {!method.available && (
                      <Badge variant="outline" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethods;