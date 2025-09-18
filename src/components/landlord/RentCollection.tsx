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

      // Fetch tenancies with unit and property info  
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

      // Fetch tenant profiles separately
      const tenantIds = (tenanciesData || []).map(t => t.tenant_id).filter(Boolean);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', tenantIds);

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

        const profile = (profilesData || []).find(p => p.user_id === tenancy.tenant_id);

        return {
          tenancy: {
            ...tenancy,
            profiles: profile || { full_name: 'Unknown', email: 'Unknown' }
          },
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
    try {
      // In a real app, this would send an email or notification
      toast({
        title: "Reminder sent",
        description: `Payment reminder sent to ${tenantName}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending reminder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalExpectedRent = collectionData.reduce((sum, data) => sum + Number(data.tenancy.rent_amount), 0);
  const totalCollected = collectionData.reduce((sum, data) => sum + data.totalPaid, 0);
  const totalOutstanding = collectionData.reduce((sum, data) => sum + data.amountDue, 0);
  const collectionRate = totalExpectedRent > 0 ? (totalCollected / totalExpectedRent) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
                <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse w-16 mb-1"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rent Collection</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="month-select" className="text-sm font-medium">
            Month:
          </label>
          <input
            id="month-select"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1 border border-border rounded-md"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpectedRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {collectionData.length} properties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {collectionRate.toFixed(1)}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {collectionData.filter(d => d.amountDue > 0).length} tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
            <Progress value={collectionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Collection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
          <CardDescription>
            Rent collection status for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {collectionData.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No rental data found</h3>
                <p className="text-sm text-muted-foreground">
                  No active tenancies found for the selected month.
                </p>
              </div>
            ) : (
              collectionData.map((data) => (
                <div key={data.tenancy.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h4 className="font-medium">{data.tenancy.profiles.full_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {data.tenancy.units.properties.name} - Unit {data.tenancy.units.unit_number}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">${Number(data.tenancy.rent_amount).toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Expected</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-green-600">${data.totalPaid.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Paid</div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${data.amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${data.amountDue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Due</div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        data.amountDue === 0 ? 'default' : 
                        data.daysOverdue > 0 ? 'destructive' : 'secondary'
                      }>
                        {data.amountDue === 0 ? 'Paid' : 
                         data.daysOverdue > 0 ? `${data.daysOverdue}d overdue` : 'Pending'}
                      </Badge>
                      
                      {data.amountDue > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(
                            data.tenancy.profiles.email,
                            data.tenancy.profiles.full_name,
                            data.amountDue
                          )}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentCollection;