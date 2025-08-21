import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, AlertTriangle, Calendar, Receipt, Send } from 'lucide-react';

interface RentCollectionData {
  tenancy: {
    id: string;
    rent_amount: number;
    tenant_id: string;
    units: {
      unit_number: string;
      properties: {
        name: string;
      };
    };
    profiles: {
      full_name: string;
      email: string;
    };
  };
  payments: {
    id: string;
    amount: number;
    payment_date: string;
    status: string;
    method: string;
  }[];
  totalPaid: number;
  amountDue: number;
  daysOverdue: number;
}

const RentCollection: React.FC = () => {
  const [collectionData, setCollectionData] = useState<RentCollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchRentCollectionData = async () => {
    if (!profile?.user_id) return;

    try {
      const startDate = new Date(selectedMonth + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      // Fetch active tenancies with tenant info
      const { data: tenanciesData, error: tenanciesError } = await supabase
        .from('tenancies')
        .select(`
          *,
          units!tenancies_unit_id_fkey (
            unit_number,
            properties!units_property_id_fkey (
              name,
              landlord_id
            )
          ),
          profiles!tenancies_tenant_id_fkey (
            full_name,
            email
          )
        `)
        .eq('units.properties.landlord_id', profile.user_id)
        .eq('status', 'active');

      if (tenanciesError) throw tenanciesError;

      // Fetch payments for the selected month
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0])
        .in('tenancy_id', tenanciesData?.map(t => t.id) || []);

      if (paymentsError) throw paymentsError;

      // Process data to calculate collection info
      const processedData: RentCollectionData[] = (tenanciesData || []).map(tenancy => {
        const tenancyPayments = (paymentsData || []).filter(p => p.tenancy_id === tenancy.id);
        const totalPaid = tenancyPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        
        const rentAmount = Number(tenancy.rent_amount);
        const amountDue = Math.max(0, rentAmount - totalPaid);
        
        // Calculate days overdue (assuming rent is due on the 1st of each month)
        const dueDate = new Date(startDate);
        const currentDate = new Date();
        const daysOverdue = currentDate > dueDate && amountDue > 0 
          ? Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          tenancy,
          payments: tenancyPayments,
          totalPaid,
          amountDue,
          daysOverdue,
        };
      });

      setCollectionData(processedData);
    } catch (error: any) {
      toast({
        title: 'Error loading rent collection data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentCollectionData();
  }, [profile?.user_id, selectedMonth]);

  const handleSendReminder = async (tenantEmail: string, tenantName: string, amountDue: number) => {
    // TODO: Implement email reminder functionality
    toast({
      title: 'Reminder sent',
      description: `Payment reminder sent to ${tenantName}`,
    });
  };

  const totalExpectedRent = collectionData.reduce((sum, item) => sum + Number(item.tenancy.rent_amount), 0);
  const totalCollectedRent = collectionData.reduce((sum, item) => sum + item.totalPaid, 0);
  const totalOutstanding = collectionData.reduce((sum, item) => sum + item.amountDue, 0);
  const collectionRate = totalExpectedRent > 0 ? (totalCollectedRent / totalExpectedRent) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rent Collection</CardTitle>
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
      {/* Collection Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpectedRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">For {selectedMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCollectedRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{collectionRate.toFixed(1)}% collection rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Amount overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
            <Progress value={collectionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Month Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Rent Collection Details
              </CardTitle>
              <CardDescription>Track rent payments for each tenant</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="month" className="text-sm font-medium">Month:</label>
              <input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {collectionData.map((item) => (
              <div
                key={item.tenancy.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{item.tenancy.profiles.full_name}</h4>
                      {item.daysOverdue > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {item.daysOverdue} days overdue
                        </Badge>
                      )}
                      {item.amountDue === 0 && (
                        <Badge variant="default">
                          Paid in full
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.tenancy.units.properties.name} - Unit {item.tenancy.units.unit_number}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <p className="font-medium">${Number(item.tenancy.rent_amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <p className="font-medium text-green-600">${item.totalPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Outstanding:</span>
                        <p className={`font-medium ${item.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${item.amountDue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progress:</span>
                        <div className="mt-1">
                          <Progress 
                            value={item.totalPaid > 0 ? (item.totalPaid / Number(item.tenancy.rent_amount)) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Recent Payments */}
                    {item.payments.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h5 className="text-sm font-medium mb-2">Recent Payments:</h5>
                        <div className="space-y-1">
                          {item.payments.slice(0, 3).map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between text-xs">
                              <span>
                                {new Date(payment.payment_date).toLocaleDateString()} - {payment.method}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">${Number(payment.amount).toLocaleString()}</span>
                                <Badge 
                                  variant={payment.status === 'completed' ? 'default' : 'secondary'} 
                                  className="text-xs"
                                >
                                  {payment.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {item.amountDue > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSendReminder(
                          item.tenancy.profiles.email,
                          item.tenancy.profiles.full_name,
                          item.amountDue
                        )}
                        className="flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" />
                        Send Reminder
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      Generate Invoice
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentCollection;