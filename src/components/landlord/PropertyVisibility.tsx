import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Building, MapPin } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  is_searchable: boolean;
}

const PropertyVisibility = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchProperties = async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, city, country, is_searchable')
        .eq('landlord_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error loading properties",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSearchability = async (propertyId: string, currentValue: boolean) => {
    try {
      setUpdating(propertyId);
      const { error } = await supabase
        .from('properties')
        .update({ is_searchable: !currentValue })
        .eq('id', propertyId)
        .eq('landlord_id', profile?.user_id); // Extra security check

      if (error) throw error;

      // Update local state
      setProperties(prev => 
        prev.map(p => 
          p.id === propertyId 
            ? { ...p, is_searchable: !currentValue }
            : p
        )
      );

      toast({
        title: !currentValue ? "Property made searchable" : "Property hidden from search",
        description: !currentValue 
          ? "Tenants can now find and request to join this property."
          : "This property is no longer visible to searching tenants.",
      });
    } catch (error: any) {
      console.error('Error updating property visibility:', error);
      toast({
        title: "Error updating property",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [profile?.user_id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-48"></div>
                </div>
                <div className="h-6 w-10 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Property Visibility Settings
        </CardTitle>
        <CardDescription>
          Control which properties are visible to tenants searching for places to join. 
          Only searchable properties will appear in tenant search results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {properties.length === 0 ? (
          <div className="text-center py-8">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No properties found</h3>
            <p className="text-sm text-muted-foreground">
              Add properties to manage their visibility settings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{property.name}</h3>
                    <Badge variant={property.is_searchable ? "default" : "secondary"} className="flex items-center gap-1">
                      {property.is_searchable ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Searchable
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Hidden
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {property.address}, {property.city}, {property.country}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {property.is_searchable 
                      ? "Tenants can search and request to join this property"
                      : "This property is hidden from tenant searches"
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={property.is_searchable}
                    onCheckedChange={() => toggleSearchability(property.id, property.is_searchable)}
                    disabled={updating === property.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyVisibility;