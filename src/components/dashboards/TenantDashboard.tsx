import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  XCircle,
  MoreVertical,
  LogOut,
  TrendingUp,
  Calendar,
  Shield,
  Zap,
  Building
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/30 pb-20 animate-fade-in">
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
              </div>
            </div>
            
            {/* Cards Skeleton */}
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-200/50 rounded-2xl"></div>
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
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Payment History
              </h2>
            </div>
            
            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment, index) => (
                  <Card 
                    key={payment.id} 
                    className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50/50 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-600' : 
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-red-100 text-red-600'
                          }`}>
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">${Number(payment.amount).toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(payment.payment_date).toLocaleDateString()} • {payment.method}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          className={`font-medium ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                            'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-green-50/30 text-center py-12">
                <CardContent>
                  <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">No payment history yet</h3>
                  <p className="text-muted-foreground">Your payment history will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'maintenance':
        return (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Maintenance
              </h2>
              <Button 
                onClick={() => currentTenancy && handleMaintenanceRequest(currentTenancy)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Wrench className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-blue-50/30 text-center py-12">
              <CardContent>
                <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No maintenance requests</h3>
                <p className="text-muted-foreground">Submit your first maintenance request when needed</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              Profile
            </h2>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-2xl bg-gradient-to-r from-purple-500 to-violet-500 text-white">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{profile?.full_name}</h3>
                    <p className="text-muted-foreground">{profile?.email}</p>
                    <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-700">
                      {profile?.role}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Phone:
                    </span>
                    <span className="font-medium">{profile?.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Member since:
                    </span>
                    <span className="font-medium">{new Date(profile?.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced My Requests Section */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Send className="h-5 w-5 text-blue-600" />
                  My Requests
                </CardTitle>
                <CardDescription>
                  Track the status of your property join requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-slate-600 mb-2">No requests yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Search for properties in the Home tab to submit your first join request.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request, index) => (
                      <Card 
                        key={request.id} 
                        className="border-l-4 border-l-primary/20 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="font-semibold text-slate-800">{request.properties.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.properties.address}
                              </div>
                              {request.units && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Home className="h-3 w-3" />
                                  Unit: {request.units.unit_number}
                                </div>
                              )}
                              {request.message && (
                                <div className="text-sm bg-blue-50 rounded-lg p-2">
                                  <span className="font-medium text-blue-700">Message: </span>
                                  {request.message}
                                </div>
                              )}
                              {request.rejection_reason && (
                                <div className="text-sm bg-red-50 rounded-lg p-2">
                                  <span className="font-medium text-red-700">Rejection reason: </span>
                                  {request.rejection_reason}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Submitted {new Date(request.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(request.status)}
                              <Badge variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'pending' ? 'secondary' : 'destructive'
                              } className="font-medium">
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
          <div className="space-y-6 animate-fade-in-up">
            {/* Property Search Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Find New Properties</h2>
              <JoinPropertySearch />
            </div>

            {/* Enhanced Urgent Alert */}
            {rentStatus === 'overdue' && (
              <Card className="border-red-200 bg-gradient-to-r from-red-50 to-red-100/30 shadow-lg animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-700">Rent Overdue</p>
                      <p className="text-sm text-red-600/80">Please pay your rent immediately to avoid penalties</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {rentStatus === 'due_soon' && (
              <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/30 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700">Rent Due Soon</p>
                      <p className="text-sm text-amber-600/80">Rent due in {daysUntilDue} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Key Info Cards */}
            <div className="grid gap-4">
              {/* Enhanced Rent Due Card */}
              <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
                rentStatus === 'paid' ? 'bg-gradient-to-br from-green-50 to-emerald-50/30' : 
                rentStatus === 'due_soon' ? 'bg-gradient-to-br from-amber-50 to-orange-50/30' : 
                'bg-gradient-to-br from-red-50 to-pink-50/30'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl shadow-lg ${
                        rentStatus === 'paid' ? 'bg-green-500 text-white' : 
                        rentStatus === 'due_soon' ? 'bg-amber-500 text-white' : 
                        'bg-red-500 text-white'
                      }`}>
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {outstandingBalance > 0 ? `$${outstandingBalance.toLocaleString()}` : 'All Paid'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {outstandingBalance > 0 ? 'Outstanding Balance' : 'Rent Status'}
                        </p>
                      </div>
                    </div>
                    <Badge className={`font-semibold ${
                      rentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 
                      rentStatus === 'due_soon' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                      'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {rentStatus === 'paid' ? 'Paid' : rentStatus === 'due_soon' ? 'Due Soon' : 'Overdue'}
                    </Badge>
                  </div>

                  {outstandingBalance > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Next Due:
                        </span>
                        <span className="font-medium">{nextDueDate.toLocaleDateString()}</span>
                      </div>
                      <Button 
                        className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        onClick={() => currentTenancy && handlePayRent(currentTenancy)}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pay Now - ${outstandingBalance.toLocaleString()}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Property Info Card */}
              {currentTenancy && (
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg">
                        <Home className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{currentTenancy.units.properties.name}</h3>
                        <p className="text-sm text-muted-foreground">Unit {currentTenancy.units.unit_number}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm bg-slate-50/50 rounded-lg p-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span>{currentTenancy.units.properties.address}, {currentTenancy.units.properties.city}</span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <span className="font-semibold text-green-600">${Number(currentTenancy.rent_amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bedrooms:</span>
                        <span className="font-medium">{currentTenancy.units.bedrooms}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bathrooms:</span>
                        <span className="font-medium">{currentTenancy.units.bathrooms}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Enhanced Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 rounded-xl"
                onClick={() => currentTenancy && handleMaintenanceRequest(currentTenancy)}
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">Maintenance</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2 border-2 hover:border-green-300 hover:bg-green-50 transition-all duration-300 rounded-xl"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium">Lease</span>
              </Button>
            </div>

            {/* Enhanced Activity Feed */}
            {activities.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Recent Activity
                </h3>
                <ActivityFeed activities={activities} />
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50/30 pb-20 animate-fade-in">
        {/* Enhanced Header */}
        <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-white/20 text-white">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold">Welcome back</h1>
                <p className="text-white/80 text-sm">{profile?.full_name}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4">
          {tenancies.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Home className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Rentals</h3>
              <p className="text-muted-foreground mb-6">
                You don't have any active tenancies yet.
              </p>
              <Button 
                onClick={() => setActiveTab('home')}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Browse Properties
              </Button>
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

      {/* Enhanced Modals */}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-fade-in">
          <div className="bg-white w-full rounded-t-3xl p-6 animate-slide-down">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Select Payment Method</h2>
              <Button variant="ghost" onClick={() => setShowPaymentMethods(false)} className="text-slate-500 hover:text-slate-700">
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
