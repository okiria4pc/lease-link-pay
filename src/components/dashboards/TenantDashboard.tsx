import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Home, 
  AlertCircle, 
  Wrench, 
  FileText, 
  Receipt, 
  Bell,
  CreditCard,
  MapPin,
  Clock,
  User,
  Send,
  CheckCircle,
  XCircle
} from 'lucide-react';
import MaintenanceRequestForm from '@/components/forms/MaintenanceRequestForm';
import PaymentInterface from '@/components/tenant/PaymentInterface';
import BottomNavigation from '@/components/mobile/BottomNavigation';
import ActivityFeed from '@/components/mobile/ActivityFeed';
import PaymentMethods from '@/components/mobile/PaymentMethods';
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

interface JoinRequest {
  id: string;
  property_id: string;
  unit_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  rejection_reason?: string;
  created_at: string;
  properties: {
    name: string;
    address: string;
  };
  units?: {
    unit_number: string;
  };
}

const TenantDashboard = () => {
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showPaymentInterface, setShowPaymentInterface] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedTenancy, setSelectedTenancy] = useState<Tenancy | null>(null);
  const [activeTab, setActiveTab] = useState('home');
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

  const fetchMyRequests = async () => {
    if (!profile?.user_id) return;

    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select(`
          *,
          properties!join_requests_property_id_fkey (
            name,
            address
          ),
          units!join_requests_unit_id_fkey (
            unit_number
          )
        `)
        .eq('tenant_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentInterface(false);
    setShowPaymentMethods(false);
    setSelectedTenancy(null);
    fetchTenantData();
  };

  const handleMaintenanceSuccess = () => {
    setShowMaintenanceForm(false);
    setSelectedTenancy(null);
  };

  const handlePayRent = (tenancy: Tenancy) => {
    setSelectedTenancy(tenancy);
    setShowPaymentMethods(true);
  };

  const handlePaymentSelect = (method: string) => {
    setShowPaymentMethods(false);
    setShowPaymentInterface(true);
  };

  const handleMaintenanceRequest = (tenancy: Tenancy) => {
    setSelectedTenancy(tenancy);
    setShowMaintenanceForm(true);
  };

  useEffect(() => {
    fetchTenantData();
    fetchMyRequests();
  }, [profile?.user_id]);

  // Listen for real-time updates on tenancies and requests
  useEffect(() => {
    if (!profile?.user_id) return;

    const tenancyChannel = supabase
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

    const requestChannel = supabase
      .channel('tenant-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'join_requests',
          filter: `tenant_id=eq.${profile.user_id}`
        },
        () => {
          console.log('Request updated, refreshing data...');
          fetchMyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tenancyChannel);
      supabase.removeChannel(requestChannel);
    };
  }, [profile?.user_id]);

  const activeTenancies = tenancies.filter(t => t.status === 'active');
  const currentTenancy = activeTenancies[0];
  
  // Calculate rent status
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const paidThisMonth = payments
    .filter(p => {
      const paymentDate = new Date(p.payment_date);
      return paymentDate.getMonth() === currentMonth && 
             paymentDate.getFullYear() === currentYear &&
             p.status === 'completed';
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalMonthlyRent = activeTenancies.reduce((sum, t) => sum + Number(t.rent_amount || 0), 0);
  const outstandingBalance = totalMonthlyRent - paidThisMonth;
  
  // Calculate days until rent due (assuming rent is due on the 1st of each month)
  const nextDueDate = new Date(currentYear, currentMonth + 1, 1);
  const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine rent status
  let rentStatus: 'paid' | 'due_soon' | 'overdue' = 'paid';
  if (outstandingBalance > 0) {
    if (daysUntilDue <= 0) {
      rentStatus = 'overdue';
    } else if (daysUntilDue <= 5) {
      rentStatus = 'due_soon';
    }
  }

  // Activity feed data
  const activities = [
    ...payments.slice(0, 3).map(p => ({
      id: p.id,
      type: 'payment' as const,
      title: 'Rent Payment',
      description: `$${Number(p.amount).toLocaleString()} via ${p.method}`,
      date: p.payment_date,
      status: p.status as 'completed' | 'pending' | 'overdue',
      amount: Number(p.amount)
    }))
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-4"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'payments':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Payment History</h2>
            </div>
            
            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">${Number(payment.amount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleDateString()} • {payment.method}
                          </div>
                        </div>
                        <Badge 
                          className={
                            payment.status === 'completed' ? 'bg-success text-success-foreground' : 
                            payment.status === 'pending' ? 'bg-warning text-warning-foreground' : 
                            'bg-destructive text-destructive-foreground'
                          }
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment history yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'maintenance':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Maintenance</h2>
              <Button onClick={() => currentTenancy && handleMaintenanceRequest(currentTenancy)}>
                <Wrench className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
            
            <Card>
              <CardContent className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No maintenance requests yet</p>
              </CardContent>
            </Card>
          </div>
        );


      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Profile</h2>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-lg">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{profile?.full_name}</h3>
                    <p className="text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{profile?.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="capitalize">{profile?.role}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Requests Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  My Requests
                </CardTitle>
                <CardDescription>
                  Track the status of your property join requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No requests yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Search for properties in the Home tab to submit your first join request.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <Card key={request.id} className="border-l-4 border-l-primary/20">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">{request.properties.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.properties.address}
                              </div>
                              {request.units && (
                                <div className="text-sm text-muted-foreground">
                                  Unit: {request.units.unit_number}
                                </div>
                              )}
                              {request.message && (
                                <div className="text-sm">
                                  <span className="font-medium">Message: </span>
                                  {request.message}
                                </div>
                              )}
                              {request.rejection_reason && (
                                <div className="text-sm text-red-600">
                                  <span className="font-medium">Rejection reason: </span>
                                  {request.rejection_reason}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Submitted {new Date(request.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(request.status)}
                              <Badge variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'pending' ? 'secondary' : 'destructive'
                              }>
                                {request.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default: // home
        return (
          <div className="space-y-6">
            {/* Property Search Section - Moved to top */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Find New Properties</h2>
              <JoinPropertySearch />
            </div>

            {/* Urgent Alert */}
            {rentStatus === 'overdue' && (
              <Card className="border-overdue bg-overdue/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-overdue flex-shrink-0" />
                    <div>
                      <p className="font-medium text-overdue">Rent Overdue</p>
                      <p className="text-sm text-overdue/80">Please pay your rent immediately</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {rentStatus === 'due_soon' && (
              <Card className="border-warning bg-warning/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-warning flex-shrink-0" />
                    <div>
                      <p className="font-medium text-warning">Rent Due Soon</p>
                      <p className="text-sm text-warning/80">Rent due in {daysUntilDue} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Info Cards */}
            <div className="grid gap-4">
              {/* Rent Due Card */}
              <Card className={`${
                rentStatus === 'paid' ? 'border-success bg-success/5' : 
                rentStatus === 'due_soon' ? 'border-warning bg-warning/5' : 
                'border-overdue bg-overdue/5'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${
                        rentStatus === 'paid' ? 'bg-success text-success-foreground' : 
                        rentStatus === 'due_soon' ? 'bg-warning text-warning-foreground' : 
                        'bg-overdue text-overdue-foreground'
                      }`}>
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {outstandingBalance > 0 ? `$${outstandingBalance.toLocaleString()}` : 'Paid'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {outstandingBalance > 0 ? 'Outstanding Balance' : 'Rent Status'}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      rentStatus === 'paid' ? 'bg-success text-success-foreground' : 
                      rentStatus === 'due_soon' ? 'bg-warning text-warning-foreground' : 
                      'bg-overdue text-overdue-foreground'
                    }>
                      {rentStatus === 'paid' ? 'Paid' : rentStatus === 'due_soon' ? 'Due Soon' : 'Overdue'}
                    </Badge>
                  </div>

                  {outstandingBalance > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Next Due Date:</span>
                        <span className="font-medium">{nextDueDate.toLocaleDateString()}</span>
                      </div>
                      <Button 
                        className="w-full h-12 text-lg font-semibold"
                        onClick={() => currentTenancy && handlePayRent(currentTenancy)}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pay Now - ${outstandingBalance.toLocaleString()}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Property Info Card */}
              {currentTenancy && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Home className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{currentTenancy.units.properties.name}</h3>
                        <p className="text-sm text-muted-foreground">Unit {currentTenancy.units.unit_number}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{currentTenancy.units.properties.address}, {currentTenancy.units.properties.city}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <span className="font-medium">${Number(currentTenancy.rent_amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bedrooms:</span>
                        <span>{currentTenancy.units.bedrooms}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bathrooms:</span>
                        <span>{currentTenancy.units.bathrooms}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => currentTenancy && handleMaintenanceRequest(currentTenancy)}
              >
                <Wrench className="h-6 w-6" />
                <span>Maintenance</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
              >
                <FileText className="h-6 w-6" />
                <span>Lease Agreement</span>
              </Button>
            </div>

            {/* Activity Feed */}
            {activities.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <ActivityFeed activities={activities} />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo on the left */}
            <div className="flex items-center">
              <img 
                src={propertyPayLogo} 
                alt="Property Pay" 
                className="h-8 w-auto"
              />
            </div>
            
            {/* Right side - Notification bell and three-dot menu */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-600" />
              </Button>
              
              {/* Three-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {tenancies.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Rentals</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any active tenancies yet.
              </p>
              <Button>Browse Properties</Button>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        notificationCount={0}
      />

      {/* Modals */}
      {showMaintenanceForm && selectedTenancy && (
        <MaintenanceRequestForm
          unitId={selectedTenancy.units.id}
          unitNumber={selectedTenancy.units.unit_number}
          propertyName={selectedTenancy.units.properties.name}
          onSuccess={handleMaintenanceSuccess}
          onCancel={() => setShowMaintenanceForm(false)}
        />
      )}

      {showPaymentMethods && selectedTenancy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-background w-full rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Select Payment Method</h2>
              <Button variant="ghost" onClick={() => setShowPaymentMethods(false)}>
                ✕
              </Button>
            </div>
            <PaymentMethods
              amount={Number(selectedTenancy.rent_amount)}
              onPaymentSelect={handlePaymentSelect}
            />
          </div>
        </div>
      )}

      {showPaymentInterface && selectedTenancy && (
        <PaymentInterface
          tenancy={selectedTenancy}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentInterface(false)}
        />
      )}
    </>
  );
};

export default TenantDashboard;
