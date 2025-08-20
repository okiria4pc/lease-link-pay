import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, DollarSign, AlertCircle, Wrench, UserCheck } from 'lucide-react';

interface Stats {
  totalProperties: number;
  totalUnits: number;
  totalTenants: number;
  totalLandlords: number;
  totalPayments: number;
  pendingMaintenance: number;
  occupiedUnits: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    totalUnits: 0,
    totalTenants: 0,
    totalLandlords: 0,
    totalPayments: 0,
    pendingMaintenance: 0,
    occupiedUnits: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAdminStats = async () => {
    try {
      // Fetch all statistics in parallel
      const [
        propertiesResponse,
        unitsResponse,
        profilesResponse,
        paymentsResponse,
        maintenanceResponse,
        tenanciesResponse
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact' }),
        supabase.from('units').select('id, status', { count: 'exact' }),
        supabase.from('profiles').select('role', { count: 'exact' }),
        supabase.from('payments').select('amount'),
        supabase.from('maintenance_requests').select('status'),
        supabase.from('tenancies').select('status')
      ]);

      const totalProperties = propertiesResponse.count || 0;
      const totalUnits = unitsResponse.count || 0;
      const occupiedUnits = unitsResponse.data?.filter(unit => unit.status === 'occupied').length || 0;
      
      const profiles = profilesResponse.data || [];
      const totalTenants = profiles.filter(p => p.role === 'tenant').length;
      const totalLandlords = profiles.filter(p => p.role === 'landlord').length;
      
      const totalPayments = paymentsResponse.data?.reduce((sum, payment) => 
        sum + Number(payment.amount || 0), 0) || 0;
      
      const pendingMaintenance = maintenanceResponse.data?.filter(req => 
        req.status === 'pending').length || 0;

      setStats({
        totalProperties,
        totalUnits,
        totalTenants,
        totalLandlords,
        totalPayments,
        pendingMaintenance,
        occupiedUnits,
      });
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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

  const occupancyRate = stats.totalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">System Overview</h2>
        <p className="text-muted-foreground">Complete overview of the property management system</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">Properties in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUnits}</div>
            <p className="text-xs text-muted-foreground">Rental units available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.occupiedUnits} of {stats.totalUnits} occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All-time payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">Registered tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Landlords</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLandlords}</div>
            <p className="text-xs text-muted-foreground">Property owners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingMaintenance}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingMaintenance > 0 ? (
                <span className="text-orange-600">Requires attention</span>
              ) : (
                <span className="text-green-600">All up to date</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant="default" className="text-lg px-3 py-1">
                Good
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Summary</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Properties per Landlord:</span>
              <span className="font-medium">
                {stats.totalLandlords > 0 ? 
                  (stats.totalProperties / stats.totalLandlords).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Units per Property:</span>
              <span className="font-medium">
                {stats.totalProperties > 0 ? 
                  (stats.totalUnits / stats.totalProperties).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Average Revenue per Unit:</span>
              <span className="font-medium">
                ${stats.totalUnits > 0 ? 
                  (stats.totalPayments / stats.totalUnits).toLocaleString() : '0'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Database:</span>
              <Badge variant="default">Online</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Authentication:</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Payment Processing:</span>
              <Badge variant="secondary">Ready (MTN MoMo pending)</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;