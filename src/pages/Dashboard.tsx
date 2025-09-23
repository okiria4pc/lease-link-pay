import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Users, DollarSign, Wrench, Sparkles } from 'lucide-react';
import LandlordDashboard from '@/components/dashboards/LandlordDashboard';
import TenantDashboard from '@/components/dashboards/TenantDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-slate-700">Preparing your dashboard</p>
            <p className="text-muted-foreground max-w-md">Loading your personalized experience...</p>
          </div>
        </div>
      </div>
    );
  }

  const getRoleConfig = () => {
    switch (profile.role) {
      case 'landlord':
        return { 
          icon: Building, 
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'from-blue-50 to-cyan-50/30',
          description: 'Manage your properties and tenants'
        };
      case 'tenant':
        return { 
          icon: Users, 
          color: 'from-green-500 to-emerald-500',
          bgColor: 'from-green-50 to-emerald-50/30',
          description: 'View your rental information and payments'
        };
      case 'admin':
        return { 
          icon: Wrench, 
          color: 'from-purple-500 to-violet-500',
          bgColor: 'from-purple-50 to-violet-50/30',
          description: 'System administration and management'
        };
      default:
        return { 
          icon: DollarSign, 
          color: 'from-gray-500 to-slate-500',
          bgColor: 'from-gray-50 to-slate-50/30',
          description: 'User dashboard'
        };
    }
  };

  const roleConfig = getRoleConfig();

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
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                Unknown Role
              </CardTitle>
              <CardDescription>
                Your role is not recognized. Please contact support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Current role: {profile.role || 'Not set'}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${roleConfig.bgColor} animate-gradient-fade`}>
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        {/* Dashboard Content */}
        <div className="animate-fade-in-up">
          {renderDashboard()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
