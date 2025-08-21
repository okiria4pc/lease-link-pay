import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign, MapPin, Download, Eye } from 'lucide-react';

interface LeaseAgreementCardProps {
  tenancy: {
    id: string;
    start_date: string;
    end_date?: string;
    rent_amount: number;
    status: string;
    units: {
      id: string;
      unit_number: string;
      bedrooms: number;
      bathrooms: number;
      properties: {
        name: string;
        address: string;
        city: string;
        country: string;
      };
    };
  };
}

const LeaseAgreementCard: React.FC<LeaseAgreementCardProps> = ({ tenancy }) => {
  const startDate = new Date(tenancy.start_date);
  const endDate = tenancy.end_date ? new Date(tenancy.end_date) : null;
  const currentDate = new Date();
  
  // Calculate lease duration
  const calculateDuration = () => {
    if (!endDate) return 'Ongoing';
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
      (endDate.getMonth() - startDate.getMonth());
    return `${monthsDiff} month${monthsDiff !== 1 ? 's' : ''}`;
  };

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!endDate) return null;
    const timeDiff = endDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff > 0 ? daysDiff : 0;
  };

  const duration = calculateDuration();
  const daysRemaining = calculateDaysRemaining();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lease Agreement
            </CardTitle>
            <CardDescription>
              {tenancy.units.properties.name} - Unit {tenancy.units.unit_number}
            </CardDescription>
          </div>
          <Badge variant={tenancy.status === 'active' ? 'default' : 'secondary'}>
            {tenancy.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Property Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Property Location</span>
            </div>
            <p className="font-medium">
              {tenancy.units.properties.address}<br />
              {tenancy.units.properties.city}, {tenancy.units.properties.country}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Monthly Rent</span>
            </div>
            <p className="font-bold text-lg">
              ${Number(tenancy.rent_amount).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Unit Details */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="font-medium mb-2">Unit Details</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Unit Number</span>
              <p className="font-medium">{tenancy.units.unit_number}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Bedrooms</span>
              <p className="font-medium">{tenancy.units.bedrooms}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Bathrooms</span>
              <p className="font-medium">{tenancy.units.bathrooms}</p>
            </div>
          </div>
        </div>

        {/* Lease Terms */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Lease Terms
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Start Date</span>
              <p className="font-medium">{startDate.toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium">{duration}</p>
            </div>
            {endDate && (
              <>
                <div>
                  <span className="text-muted-foreground">End Date</span>
                  <p className="font-medium">{endDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days Remaining</span>
                  <p className={`font-medium ${daysRemaining && daysRemaining < 30 ? 'text-orange-600' : ''}`}>
                    {daysRemaining !== null ? `${daysRemaining} days` : 'Ongoing'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Renewal Notice */}
        {daysRemaining && daysRemaining < 90 && daysRemaining > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <div className="flex gap-2">
              <Calendar className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-900 dark:text-orange-100">Lease Renewal Notice</p>
                <p className="text-orange-700 dark:text-orange-300">
                  Your lease expires in {daysRemaining} days. Contact your landlord to discuss renewal options.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1 flex-1">
            <Eye className="h-4 w-4" />
            View Agreement
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1 flex-1">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaseAgreementCard;