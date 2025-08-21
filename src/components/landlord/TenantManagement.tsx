import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Phone, Mail, MapPin, Calendar, DollarSign } from 'lucide-react';

interface TenantInfo {
  id: string;
  tenant_id: string;
  start_date: string;
  end_date?: string;
  rent_amount: number;
  status: string;
  units: {
    id: string;
    unit_number: string;
    properties: {
      name: string;
      address: string;
    };
  };
  profiles: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

interface Unit {
  id: string;
  unit_number: string;
  status: string;
  property_id: string;
  properties: {
    name: string;
  };
}

const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [addTenantForm, setAddTenantForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    unitId: '',
    rentAmount: '',
    startDate: '',
    endDate: '',
  });
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchTenantData = async () => {
    if (!profile?.user_id) return;

    try {
      // Fetch tenancies with tenant profiles
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenancies')
        .select(`
          *,
          units!tenancies_unit_id_fkey (
            id,
            unit_number,
            properties!units_property_id_fkey (
              name,
              address,
              landlord_id
            )
          ),
          profiles!tenancies_tenant_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .eq('units.properties.landlord_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch available units for new tenants
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          *,
          properties!units_property_id_fkey (
            name,
            landlord_id
          )
        `)
        .eq('properties.landlord_id', profile.user_id)
        .eq('status', 'vacant');

      if (unitsError) throw unitsError;

      setTenants(tenantsData || []);
      setAvailableUnits(unitsData || []);
    } catch (error: any) {
      toast({
        title: 'Error loading tenant data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, [profile?.user_id]);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // First check if user exists or create profile
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', addTenantForm.email)
        .single();

      let tenantUserId = existingUser?.user_id;

      if (!tenantUserId) {
        // Create a new user profile (in real scenario, user would sign up)
        // For now, we'll create a profile placeholder
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            email: addTenantForm.email,
            full_name: addTenantForm.fullName,
            phone: addTenantForm.phone,
            role: 'tenant',
          }])
          .select('user_id')
          .single();

        if (profileError) throw profileError;
        tenantUserId = newProfile.user_id;
      }

      // Create tenancy
      const { error: tenancyError } = await supabase
        .from('tenancies')
        .insert([{
          tenant_id: tenantUserId,
          unit_id: addTenantForm.unitId,
          rent_amount: Number(addTenantForm.rentAmount),
          start_date: addTenantForm.startDate,
          end_date: addTenantForm.endDate || null,
          status: 'active',
        }]);

      if (tenancyError) throw tenancyError;

      // Update unit status to occupied
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: 'occupied' })
        .eq('id', addTenantForm.unitId);

      if (unitError) throw unitError;

      toast({
        title: 'Tenant added successfully',
        description: `${addTenantForm.fullName} has been added as a tenant.`,
      });

      setShowAddTenant(false);
      setAddTenantForm({
        email: '',
        fullName: '',
        phone: '',
        unitId: '',
        rentAmount: '',
        startDate: '',
        endDate: '',
      });
      fetchTenantData();
    } catch (error: any) {
      toast({
        title: 'Error adding tenant',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Tenant Management
              </CardTitle>
              <CardDescription>Manage your tenants and their lease agreements</CardDescription>
            </div>
            <Dialog open={showAddTenant} onOpenChange={setShowAddTenant}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Tenant</DialogTitle>
                  <DialogDescription>
                    Add a tenant to one of your available units
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddTenant} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={addTenantForm.email}
                      onChange={(e) => setAddTenantForm({ ...addTenantForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={addTenantForm.fullName}
                      onChange={(e) => setAddTenantForm({ ...addTenantForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={addTenantForm.phone}
                      onChange={(e) => setAddTenantForm({ ...addTenantForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select 
                      value={addTenantForm.unitId} 
                      onValueChange={(value) => setAddTenantForm({ ...addTenantForm, unitId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select available unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.properties.name} - Unit {unit.unit_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rentAmount">Monthly Rent</Label>
                    <Input
                      id="rentAmount"
                      type="number"
                      step="0.01"
                      value={addTenantForm.rentAmount}
                      onChange={(e) => setAddTenantForm({ ...addTenantForm, rentAmount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={addTenantForm.startDate}
                        onChange={(e) => setAddTenantForm({ ...addTenantForm, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date (Optional)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={addTenantForm.endDate}
                        onChange={(e) => setAddTenantForm({ ...addTenantForm, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">Add Tenant</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddTenant(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No tenants yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add tenants to your available units to start managing rentals.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{tenant.profiles.full_name}</h4>
                        <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                          {tenant.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{tenant.profiles.email}</span>
                          </div>
                          {tenant.profiles.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{tenant.profiles.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{tenant.units.properties.name} - Unit {tenant.units.unit_number}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>${Number(tenant.rent_amount).toLocaleString()}/month</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(tenant.start_date).toLocaleDateString()}
                              {tenant.end_date && ` - ${new Date(tenant.end_date).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        Send Message
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantManagement;