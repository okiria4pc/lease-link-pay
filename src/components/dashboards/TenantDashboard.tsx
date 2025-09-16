import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, DollarSign, Home, AlertCircle, Wrench, FileText, Receipt } from 'lucide-react';
import MaintenanceRequestForm from '@/components/forms/MaintenanceRequestForm';
import PaymentInterface from '@/components/tenant/PaymentInterface';
import LeaseAgreementCard from '@/components/tenant/LeaseAgreementCard';
import MaintenanceRequests from '@/components/tenant/MaintenanceRequests';
import JoinPropertySearch from '@/components/tenant/JoinPropertySearch';

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
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showPaymentInterface, setShowPaymentInterface] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<Tenancy | null>(null);
  const [defaultTab, setDefaultTab] = useState('overview');
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

  const handlePaymentSuccess = () => {
    setShowPaymentInterface(false);
    setSelectedTenancy(null);
    fetchTenantData();
  };

  const handleMaintenanceSuccess = () => {
    setShowMaintenanceForm(false);
    setSelectedTenancy(null);
  };

  const handlePayRent = (tenancy: Tenancy) => {
    setSelectedTenancy(tenancy);
    setShowPaymentInterface(true);
  };

  const handleMaintenanceRequest = (tenancy: Tenancy) => {
    setSelectedTenancy(tenancy);
    setShowMaintenanceForm(true);
  };

  useEffect(() => {
    fetchTenantData();
  }, [profile?.user_id]);

  // Listen for real-time updates on tenancies
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('tenant-tenancies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenancies',
          filter: `tenant_id=eq.${profile.user_id}`
        },
        () => {
          console.log('Tenancy updated, refreshing data...');
          fetchTenantData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      <div className="space-y-6">
        {/* Stats Cards - Show zeros for new tenants */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Currently renting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">Total monthly rent due</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">Payments this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs - Allow access to Join Property feature */}
        <Tabs value={defaultTab} onValueChange={setDefaultTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join">Join Property</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="join" className="space-y-4">
            <JoinPropertySearch />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Your Tenant Dashboard</CardTitle>
                <CardDescription>
                  You don't have any active tenancies yet. Use the "Join Property" tab to search and request to join available rental properties.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No rental units found</p>
                  <Button onClick={() => setDefaultTab('join')}>
                    Browse Properties
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="join">Join Property</TabsTrigger>
          <TabsTrigger value="lease">Lease</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                      <Button 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => handlePayRent(tenancy)}
                      >
                        Pay Rent
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={() => handleMaintenanceRequest(tenancy)}
                      >
                        <Wrench className="h-4 w-4" />
                        Maintenance
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="join" className="space-y-4">
          <JoinPropertySearch />
        </TabsContent>

        <TabsContent value="lease" className="space-y-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Lease Agreements</h2>
            {activeTenancies.map((tenancy) => (
              <LeaseAgreementCard key={tenancy.id} tenancy={tenancy} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Payment History</h2>
              {activeTenancies.length > 0 && (
                <Button 
                  onClick={() => handlePayRent(activeTenancies[0])}
                  className="flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Make Payment
                </Button>
              )}
            </div>
            
            {payments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>All your rent payments and receipts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <div className="font-medium">${Number(payment.amount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleDateString()} • {payment.method}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            payment.status === 'completed' ? 'default' : 
                            payment.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {payment.status}
                          </Badge>
                          {payment.status === 'completed' && (
                            <Button variant="ghost" size="sm">
                              <Receipt className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No payment history</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your payment history will appear here once you make your first payment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <MaintenanceRequests 
            onCreateRequest={() => {
              if (activeTenancies.length > 0) {
                handleMaintenanceRequest(activeTenancies[0]);
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showMaintenanceForm && selectedTenancy && (
        <MaintenanceRequestForm
          unitId={selectedTenancy.units.id}
          unitNumber={selectedTenancy.units.unit_number}
          propertyName={selectedTenancy.units.properties.name}
          onSuccess={handleMaintenanceSuccess}
          onCancel={() => {
            setShowMaintenanceForm(false);
            setSelectedTenancy(null);
          }}
        />
      )}

      {showPaymentInterface && selectedTenancy && (
        <PaymentInterface
          tenancy={selectedTenancy}
          onSuccess={handlePaymentSuccess}
          onCancel={() => {
            setShowPaymentInterface(false);
            setSelectedTenancy(null);
          }}
        />
      )}
    </div>
  );
};

export default TenantDashboard;