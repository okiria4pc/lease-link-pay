import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { X, AlertTriangle, Wrench, Zap, Droplets } from 'lucide-react';

interface MaintenanceRequestFormProps {
  unitId: string;
  unitNumber: string;
  propertyName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const urgencyLevels = [
  { value: 'low', label: 'Low', icon: Wrench, color: 'text-blue-500' },
  { value: 'medium', label: 'Medium', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'high', label: 'High', icon: Zap, color: 'text-red-500' },
  { value: 'emergency', label: 'Emergency', icon: Droplets, color: 'text-red-700' },
];

const MaintenanceRequestForm: React.FC<MaintenanceRequestFormProps> = ({
  unitId,
  unitNumber,
  propertyName,
  onSuccess,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const categories = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Appliances',
    'Structural',
    'Pest Control',
    'Locks/Security',
    'Cleaning',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .insert([
          {
            unit_id: unitId,
            tenant_id: profile.user_id,
            title,
            description: `Category: ${category}\nUrgency: ${urgency}\n\n${description}`,
            status: 'pending',
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Maintenance request submitted',
        description: 'Your request has been sent to your landlord.',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error submitting request',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedUrgency = urgencyLevels.find(u => u.value === urgency);
  const UrgencyIcon = selectedUrgency?.icon;

  return (
    <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle>Maintenance Request</CardTitle>
            <CardDescription>
              {propertyName} - Unit {unitNumber}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select value={urgency} onValueChange={setUrgency} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map((level) => {
                    const Icon = level.icon;
                    return (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${level.color}`} />
                          <span>{level.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedUrgency && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {UrgencyIcon && <UrgencyIcon className={`h-4 w-4 ${selectedUrgency.color}`} />}
                  <span>
                    {urgency === 'emergency' 
                      ? 'Immediate attention required' 
                      : urgency === 'high'
                      ? 'Should be addressed within 24-48 hours'
                      : urgency === 'medium'
                      ? 'Should be addressed within a week'
                      : 'Can be scheduled for convenient time'
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide detailed information about the issue, including when it started, any relevant circumstances, etc."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </form>
      </div>
    </Card>
  );
};

export default MaintenanceRequestForm;