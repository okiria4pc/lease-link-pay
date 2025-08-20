import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
}

interface UnitFormProps {
  properties: Property[];
  onSuccess: () => void;
  onCancel: () => void;
}

const UnitForm: React.FC<UnitFormProps> = ({ properties, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    bedrooms: '',
    bathrooms: '',
    rent_amount: '',
    status: 'vacant',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('units')
        .insert({
          ...formData,
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms),
          rent_amount: parseFloat(formData.rent_amount),
        });

      if (error) throw error;

      toast({
        title: "Unit added successfully",
        description: `Unit ${formData.unit_number} has been added.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error adding unit:', error);
      toast({
        title: "Error adding unit",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Unit</CardTitle>
        <CardDescription>Add a rental unit to one of your properties</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="property_id">Property</Label>
            <Select 
              value={formData.property_id} 
              onValueChange={(value) => handleSelectChange('property_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="unit_number">Unit Number</Label>
            <Input
              id="unit_number"
              name="unit_number"
              placeholder="e.g., 101, A1, etc."
              value={formData.unit_number}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                placeholder="Number of bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                name="bathrooms"
                type="number"
                min="0"
                placeholder="Number of bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rent_amount">Monthly Rent ($)</Label>
            <Input
              id="rent_amount"
              name="rent_amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 1200.00"
              value={formData.rent_amount}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleSelectChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Under Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !formData.property_id} className="flex-1">
              {loading ? 'Adding Unit...' : 'Add Unit'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UnitForm;