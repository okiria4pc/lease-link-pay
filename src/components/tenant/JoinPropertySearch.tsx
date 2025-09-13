import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Home, MapPin, DollarSign, Bed, Bath, Send, Clock, CheckCircle, XCircle } from 'lucide-react';

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

const JoinPropertySearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
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
      fetchMyRequests();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error submitting request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [profile?.user_id]);

  // Real-time subscription for request updates
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('join_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'join_requests',
          filter: `tenant_id=eq.${profile.user_id}`
        },
        () => {
          fetchMyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id]);

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
                Search for properties above to submit your first join request.
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