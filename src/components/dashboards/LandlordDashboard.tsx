import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, DollarSign, Plus, Home, Wallet, Receipt, RefreshCw, TrendingUp, MapPin } from 'lucide-react';
import PropertyForm from '@/components/forms/PropertyForm';
import UnitForm from '@/components/forms/UnitForm';
import TenantManagement from '@/components/landlord/TenantManagement';
import RentCollection from '@/components/landlord/RentCollection';
import PayoutRequests from '@/components/landlord/PayoutRequests';
import PendingRequests from '@/components/landlord/PendingRequests';
import PropertyVisibility from '@/components/landlord/PropertyVisibility';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  created_at: string;
}

interface Unit {
  id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  status: string;
  property_id: string;
  properties?: Property;
}

const LandlordDashboard = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching properties data...');
      
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to view your properties');
      }
      console.log('Authenticated user:', user.id);
      
      // Fetch properties owned by current user
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Properties query result:', { data: propertiesData, error: propertiesError });
      if (propertiesError) throw propertiesError;

      // Fetch units with property data - simplified query to avoid join issues
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Units query result:', { data: unitsData, error: unitsError });
      if (unitsError) throw unitsError;

      // If we have units, fetch property details for each unit
      let unitsWithProperties: Unit[] = [];
      if (unitsData && unitsData.length > 0) {
        unitsWithProperties = unitsData.map((unit) => {
          const property = propertiesData?.find(p => p.id === unit.property_id);
          return { ...unit, properties: property };
        });
      }

      setProperties(propertiesData || []);
      setUnits(unitsWithProperties);
      
      console.log('Data fetched successfully:', {
        properties: propertiesData?.length || 0,
        units: unitsWithProperties?.length || 0
      });
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message);
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
    fetchData();
  }, []);

  const handlePropertyAdded = () => {
    setShowPropertyForm(false);
    fetchData();
    toast({
      title: "Property added",
      description: "Your property has been successfully added.",
    });
  };

  const handleUnitAdded = () => {
    setShowUnitForm(false);
    fetchData();
    toast({
      title: "Unit added",
      description: "Your unit has been successfully added.",
    });
  };

  const totalUnits = units.length;
  const occupiedUnits = units.filter(unit => unit.status === 'occupied').length;
  const totalRent = units.reduce((sum, unit) => sum + Number(unit.rent_amount || 0), 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-gradient-to-br from-slate-50 to-blue-50/30 border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="h-4 bg-slate-200 rounded-full w-24"></div>
                <div className="h-6 w-6 bg-slate-200 rounded-lg"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded-full w-20 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded-full w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
            <CardTitle className="text-sm font-semibold text-blue-700">Total Properties</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-blue-900 mb-1">{properties.length}</div>
            <p className="text-xs text-blue-600/80 font-medium">Properties under management</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
            <CardTitle className="text-sm font-semibold text-green-700">Occupancy Rate</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-green-900 mb-1">{occupancyRate}%</div>
            <p className="text-xs text-green-600/80 font-medium">
              {occupiedUnits} of {totalUnits} units occupied
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-10 translate-x-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
            <CardTitle className="text-sm font-semibold text-amber-700">Total Rent Value</CardTitle>
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-amber-900 mb-1">${totalRent.toLocaleString()}</div>
            <p className="text-xs text-amber-600/80 font-medium">Monthly rental income potential</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 bg-slate-100/50 p-1 rounded-2xl border">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Requests
          </TabsTrigger>
          <TabsTrigger value="visibility" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Visibility
          </TabsTrigger>
          <TabsTrigger value="tenants" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Tenants
          </TabsTrigger>
          <TabsTrigger value="collection" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Collection
          </TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Payouts
          </TabsTrigger>
          <TabsTrigger value="properties" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-fade-in-up">
          {/* Enhanced Action Buttons */}
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={() => setShowPropertyForm(true)} 
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
            <Button 
              onClick={() => setShowUnitForm(true)} 
              variant="outline" 
              className="flex items-center gap-2 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
              disabled={properties.length === 0}
            >
              <Home className="h-4 w-4" />
              Add Unit
            </Button>
            <Button 
              onClick={fetchData} 
              variant="outline" 
              className="flex items-center gap-2 border-2 hover:border-green-300 hover:bg-green-50 transition-all duration-300"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>

          {/* Enhanced Error Message */}
          {error && (
            <Card className="border-red-200 bg-red-50/50 animate-fade-in">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <span>⚠️ Error Loading Data</span>
                </CardTitle>
                <CardDescription className="text-red-600">{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={fetchData} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {properties.length === 0 ? (
            <Card className="text-center py-12 bg-gradient-to-br from-slate-50 to-blue-50/30 border-0 shadow-lg animate-fade-in-up">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-800">Welcome to Property Pay</CardTitle>
                <CardDescription className="text-lg text-slate-600 max-w-md mx-auto">
                  Get started by adding your first property. You can then add units to each property and manage your rentals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowPropertyForm(true)} 
                  className="flex items-center gap-2 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Property
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, index) => {
                const propertyUnits = units.filter(unit => unit.property_id === property.id);
                const occupiedCount = propertyUnits.filter(unit => unit.status === 'occupied').length;
                const propertyRent = propertyUnits.reduce((sum, unit) => sum + Number(unit.rent_amount || 0), 0);
                
                return (
                  <Card 
                    key={property.id} 
                    className="hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-white to-slate-50/50 shadow-lg animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg font-bold text-slate-800">{property.name}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {propertyUnits.length} unit{propertyUnits.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-slate-600">
                        <MapPin className="h-3 w-3" />
                        {property.address}, {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Occupancy:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {occupiedCount}/{propertyUnits.length}
                          </span>
                          <div className="w-16 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${propertyUnits.length > 0 ? (occupiedCount / propertyUnits.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Monthly Rent:</span>
                        <span className="font-semibold text-green-600">
                          ${propertyRent.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Other tabs remain functionally the same but will inherit the new styling */}
        <TabsContent value="requests" className="animate-fade-in-up">
          <PendingRequests />
        </TabsContent>

        <TabsContent value="visibility" className="animate-fade-in-up">
          <PropertyVisibility />
        </TabsContent>

        <TabsContent value="tenants" className="animate-fade-in-up">
          <TenantManagement />
        </TabsContent>

        <TabsContent value="collection" className="animate-fade-in-up">
          <RentCollection />
        </TabsContent>

        <TabsContent value="payouts" className="animate-fade-in-up">
          <PayoutRequests />
        </TabsContent>

        <TabsContent value="properties" className="space-y-6 animate-fade-in-up">
          {/* Same enhanced property management content */}
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={() => setShowPropertyForm(true)} 
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
            <Button 
              onClick={() => setShowUnitForm(true)} 
              variant="outline" 
              className="flex items-center gap-2 border-2 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
              disabled={properties.length === 0}
            >
              <Home className="h-4 w-4" />
              Add Unit
            </Button>
          </div>

          {properties.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, index) => {
                const propertyUnits = units.filter(unit => unit.property_id === property.id);
                const occupiedCount = propertyUnits.filter(unit => unit.status === 'occupied').length;
                const propertyRent = propertyUnits.reduce((sum, unit) => sum + Number(unit.rent_amount || 0), 0);
                
                return (
                  <Card 
                    key={property.id} 
                    className="hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-white to-slate-50/50 shadow-lg animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg font-bold text-slate-800">{property.name}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                          {propertyUnits.length} unit{propertyUnits.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-slate-600">
                        <MapPin className="h-3 w-3" />
                        {property.address}, {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Occupancy:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {occupiedCount}/{propertyUnits.length}
                          </span>
                          <div className="w-16 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${propertyUnits.length > 0 ? (occupiedCount / propertyUnits.length) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Monthly Rent:</span>
                        <span className="font-semibold text-green-600">
                          ${propertyRent.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Forms */}
      {showPropertyForm && (
        <PropertyForm 
          onSuccess={handlePropertyAdded}
          onCancel={() => setShowPropertyForm(false)}
        />
      )}

      {showUnitForm && (
        <UnitForm 
          properties={properties}
          onSuccess={handleUnitAdded}
          onCancel={() => setShowUnitForm(false)}
        />
      )}
    </div>
  );
};

export default LandlordDashboard;
