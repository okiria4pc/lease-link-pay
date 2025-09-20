import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, DollarSign, Bed, Bath } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  units: Unit[];
}

interface Unit {
  id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  status: string;
}

const JoinPropertySearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('any');
  const [message, setMessage] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const searchProperties = async () => {
    if (!searchTerm.trim()) {
      setProperties([]);
      return;
    }

    setLoading(true);
    try {
      // Search properties that are searchable
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          name,
          address,
          city,
          country,
          units!units_property_id_fkey (
            id,
            unit_number,
            bedrooms,
            bathrooms,
            rent_amount,
            status
          )
        `)
        .eq('is_searchable', true)
        .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);
    } catch (error: any) {
      console.error('Error searching properties:', error);
      toast({
        title: "Error searching properties",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!profile?.user_id || !selectedProperty) return;

    try {
      const requestData = {
        tenant_id: profile.user_id,
        property_id: selectedProperty.id,
        unit_id: selectedUnit && selectedUnit !== "any" ? selectedUnit : null,
        message: message.trim() || null,
      };

      const { error } = await supabase
        .from('join_requests')
        .insert([requestData]);

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "Your join request has been sent to the landlord.",
      });

      setShowRequestDialog(false);
      setSelectedProperty(null);
      setSelectedUnit('any');
      setMessage('');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error submitting request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const availableUnits = selectedProperty?.units.filter(unit => unit.status === 'vacant') || [];

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Properties to Join
          </CardTitle>
          <CardDescription>
            Find properties to join by searching their name, address, or city
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchProperties()}
            />
            <Button onClick={searchProperties} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Results */}
          {properties.length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="font-medium">Search Results</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {properties.map((property) => (
                  <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span>{property.name}</span>
                        <Badge variant="outline">
                          {property.units?.length || 0} units
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {property.address}, {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Available Units: </span>
                          {property.units?.filter(u => u.status === 'vacant').length || 0}
                        </div>
                        {property.units?.filter(u => u.status === 'vacant').length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Rent range: ${Math.min(...property.units.filter(u => u.status === 'vacant').map(u => Number(u.rent_amount)))} - 
                            ${Math.max(...property.units.filter(u => u.status === 'vacant').map(u => Number(u.rent_amount)))}
                          </div>
                        )}
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => {
                          setSelectedProperty(property);
                          setShowRequestDialog(true);
                        }}
                        disabled={property.units?.filter(u => u.status === 'vacant').length === 0}
                      >
                        {property.units?.filter(u => u.status === 'vacant').length === 0 
                          ? 'No Available Units' 
                          : 'Request to Join'
                        }
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Join Property</DialogTitle>
            <DialogDescription>
              Submit a request to join {selectedProperty?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {availableUnits.length > 0 && (
              <div>
                <label className="text-sm font-medium">Select Unit (Optional)</label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any available unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any available unit</SelectItem>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        Unit {unit.unit_number} - {unit.bedrooms} bed, {unit.bathrooms} bath - ${Number(unit.rent_amount).toLocaleString()}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Message to Landlord (Optional)</label>
              <Textarea
                placeholder="Introduce yourself and explain why you'd like to join this property..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitRequest}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JoinPropertySearch;