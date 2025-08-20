import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Users, DollarSign, Wrench } from 'lucide-react';
import LandlordDashboard from '@/components/dashboards/LandlordDashboard';
import TenantDashboard from '@/components/dashboards/TenantDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (profile.role) {
      case 'landlord':
        return <LandlordDashboard />;
      case 'tenant':
        return <TenantDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Unknown Role</CardTitle>
              <CardDescription>Your role is not recognized. Please contact support.</CardDescription>
            </CardHeader>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile.full_name || profile.email}
          </p>
        </div>
      </div>

      {renderDashboard()}
    </div>
  );
};

export default Dashboard;