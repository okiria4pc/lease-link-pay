import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, DollarSign, Plus, Home, Wallet, Receipt } from 'lucide-react';
import PropertyForm from '@/components/forms/PropertyForm';
import UnitForm from '@/components/forms/UnitForm';
import TenantManagement from '@/components/landlord/TenantManagement';
import RentCollection from '@/components/landlord/RentCollection';
import PayoutRequests from '@/components/landlord/PayoutRequests';

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
  properties: Property;
}

const LandlordDashboard = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      console.log('Fetching properties data...');
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Properties data:', propertiesData, 'Error:', propertiesError);
      if (propertiesError) throw propertiesError;

      // Fetch units with property data
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          *,
          properties!units_property_id_fkey (
            id,
            name,
            address,
            city,
            country,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (unitsError) throw unitsError;

      setProperties(propertiesData || []);
      setUnits(unitsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">Properties under management</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {occupiedUnits} of {totalUnits} units occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rent Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly rental income potential</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={() => setShowPropertyForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
            <Button 
              onClick={() => setShowUnitForm(true)} 
              variant="outline" 
              className="flex items-center gap-2"
              disabled={properties.length === 0}
            >
              <Home className="h-4 w-4" />
              Add Unit
            </Button>
          </div>

          {properties.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Your Property Management Dashboard</CardTitle>
                <CardDescription>
                  Get started by adding your first property. You can then add units to each property and manage your rentals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowPropertyForm(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Property
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => {
                const propertyUnits = units.filter(unit => unit.property_id === property.id);
                const occupiedCount = propertyUnits.filter(unit => unit.status === 'occupied').length;
                
                return (
                  <Card key={property.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{property.name}</span>
                        <Badge variant="outline">
                          {propertyUnits.length} unit{propertyUnits.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {property.address}, {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Occupancy:</span>
                          <span className="font-medium">
                            {occupiedCount}/{propertyUnits.length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Monthly Rent:</span>
                          <span className="font-medium">
                            ${propertyUnits.reduce((sum, unit) => sum + Number(unit.rent_amount || 0), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tenants">
          <TenantManagement />
        </TabsContent>

        <TabsContent value="collection">
          <RentCollection />
        </TabsContent>

        <TabsContent value="payouts">
          <PayoutRequests />
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          {/* Same property management content as before */}
          <div className="flex gap-4">
            <Button onClick={() => setShowPropertyForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
            <Button 
              onClick={() => setShowUnitForm(true)} 
              variant="outline" 
              className="flex items-center gap-2"
              disabled={properties.length === 0}
            >
              <Home className="h-4 w-4" />
              Add Unit
            </Button>
          </div>

          {properties.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => {
                const propertyUnits = units.filter(unit => unit.property_id === property.id);
                const occupiedCount = propertyUnits.filter(unit => unit.status === 'occupied').length;
                
                return (
                  <Card key={property.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{property.name}</span>
                        <Badge variant="outline">
                          {propertyUnits.length} unit{propertyUnits.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {property.address}, {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Occupancy:</span>
                          <span className="font-medium">
                            {occupiedCount}/{propertyUnits.length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Monthly Rent:</span>
                          <span className="font-medium">
                            ${propertyUnits.reduce((sum, unit) => sum + Number(unit.rent_amount || 0), 0).toLocaleString()}
                          </span>
                        </div>
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