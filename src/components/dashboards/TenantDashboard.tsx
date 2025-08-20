import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, DollarSign, Home, AlertCircle, Wrench } from 'lucide-react';

interface Tenancy {
  id: string;
  start_date: string;
  end_date?: string;
  rent_amount: number;
  status: string;
  units: {
    id: string;
    unit_number: string;
    bedrooms: number;
    bathrooms: number;
    properties: {
      name: string;
      address: string;
      city: string;
      country: string;
    };
  };
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  method: string;
}

const TenantDashboard = () => {
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchTenantData = async () => {
    if (!profile?.user_id) return;

    try {
      // Fetch tenancies
      const { data: tenanciesData, error: tenanciesError } = await supabase
        .from('tenancies')
        .select(`
          *,
          units!tenancies_unit_id_fkey (
            id,
            unit_number,
            bedrooms,
            bathrooms,
            properties!units_property_id_fkey (
              name,
              address,
              city,
              country
            )
          )
        `)
        .eq('tenant_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (tenanciesError) throw tenanciesError;

      // Fetch payments for user's tenancies
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('tenancy_id', tenanciesData?.map(t => t.id) || [])
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      setTenancies(tenanciesData || []);
      setPayments(paymentsData || []);
    } catch (error: any) {
      console.error('Error fetching tenant data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [profile?.user_id]);

  const activeTenancies = tenancies.filter(t => t.status === 'active');
  const totalMonthlyRent = activeTenancies.reduce((sum, t) => sum + Number(t.rent_amount || 0), 0);
  const paidThisMonth = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date);
      const currentMonth = new Date();
      return paymentDate.getMonth() === currentMonth.getMonth() && 
             paymentDate.getFullYear() === currentMonth.getFullYear() &&
             p.status === 'completed';
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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

  if (tenancies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Your Tenant Dashboard</CardTitle>
          <CardDescription>
            You don't have any active tenancies. Contact your landlord to get set up with a rental unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No rental units found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenancies.length}</div>
            <p className="text-xs text-muted-foreground">Currently renting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total monthly rent due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paidThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Payments this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Rentals */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">My Rentals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {activeTenancies.map((tenancy) => (
            <Card key={tenancy.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{tenancy.units.properties.name}</span>
                  <Badge variant={tenancy.status === 'active' ? 'default' : 'secondary'}>
                    {tenancy.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Unit {tenancy.units.unit_number} - {tenancy.units.bedrooms} bed, {tenancy.units.bathrooms} bath
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Address:</span>
                    <span className="font-medium text-right">
                      {tenancy.units.properties.address}, {tenancy.units.properties.city}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Rent:</span>
                    <span className="font-medium">${Number(tenancy.rent_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Start Date:</span>
                    <span className="font-medium">
                      {new Date(tenancy.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  {tenancy.end_date && (
                    <div className="flex justify-between text-sm">
                      <span>End Date:</span>
                      <span className="font-medium">
                        {new Date(tenancy.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1">
                    Pay Rent
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <Wrench className="h-4 w-4" />
                    Maintenance
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Recent Payments</h2>
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Your recent rent payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">${Number(payment.amount).toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString()} • {payment.method}
                      </div>
                    </div>
                    <Badge variant={
                      payment.status === 'completed' ? 'default' : 
                      payment.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TenantDashboard;