import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Clock, CheckCircle, XCircle, MapPin, Home, User, Calendar, MessageSquare } from 'lucide-react';

interface JoinRequest {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  rejection_reason?: string;
  created_at: string;
  properties: {
    name: string;
    address: string;
    city: string;
  };
  units?: {
    unit_number: string;
    bedrooms: number;
    bathrooms: number;
    rent_amount: number;
  };
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

const PendingRequests = () => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchRequests = async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);
      
      // First get the property IDs that belong to this landlord
      const { data: landlordProperties, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', profile.user_id);

      if (propertiesError) throw propertiesError;
      
      const propertyIds = landlordProperties?.map(p => p.id) || [];
      
      if (propertyIds.length === 0) {
        setRequests([]);
        return;
      }

      // Now get join requests for those properties
      const { data, error } = await supabase
        .from('join_requests')
        .select(`
          *,
          properties!join_requests_property_id_fkey (
            name,
            address,
            city
          ),
          units!join_requests_unit_id_fkey (
            unit_number,
            bedrooms,
            bathrooms,
            rent_amount
          ),
          profiles!join_requests_tenant_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .in('property_id', propertyIds)
        .eq('status', 'pending')
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
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (request: JoinRequest) => {
    try {
      // First, create the tenancy record (this is the critical part)
      const tenancyData = {
        tenant_id: request.tenant_id,
        unit_id: request.unit_id,
        rent_amount: Number(request.units?.rent_amount || 0),
        start_date: new Date().toISOString().split('T')[0],
        status: 'active'
      };

      console.log('Creating tenancy with data:', tenancyData);

      const { data: tenancyResult, error: tenancyError } = await supabase
        .from('tenancies')
        .insert([tenancyData])
        .select()
        .single();

      if (tenancyError) {
        console.error('Tenancy creation error:', tenancyError);
        throw new Error(`Failed to create tenancy: ${tenancyError.message}`);
      }

      console.log('Tenancy created successfully:', tenancyResult);

      // Then update the join request status
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (updateError) {
        console.error('Join request update error:', updateError);
        throw updateError;
      }

      // Finally, mark unit as occupied
      if (request.unit_id) {
        const { error: unitError } = await supabase
          .from('units')
          .update({ status: 'occupied' })
          .eq('id', request.unit_id);

        if (unitError) {
          console.error('Unit status update error:', unitError);
          // Don't throw here as the main operations succeeded
        }
      }

      toast({
        title: "Request approved",
        description: `${request.profiles?.full_name || 'User'} is now your tenant! View them in the Tenants tab.`,
      });

      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error approving request",
        description: error.message || "Failed to create tenancy. Please try again.",
        variant: "destructive",
      });
    }
  };

  const rejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('join_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason.trim() || null
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Request rejected",
        description: `${selectedRequest.profiles?.full_name || 'User'}'s request has been rejected.`,
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error rejecting request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [profile?.user_id]);

  // Real-time subscription for new requests
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('pending_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'join_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-1/3"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                <div className="h-8 bg-muted rounded animate-pulse w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pending Join Requests
          </CardTitle>
          <CardDescription>
            Review and approve tenant requests to join your properties. Approved requests automatically become active tenancies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No pending requests</h3>
              <p className="text-sm text-muted-foreground">
                New tenant requests will appear here when submitted.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-yellow-400">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Header with tenant and property info */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{request.profiles?.full_name || 'Unknown User'}</span>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.profiles?.email || 'No email'}
                            {request.profiles?.phone && ` • ${request.profiles.phone}`}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Property and unit details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{request.properties.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 ml-6">
                          <MapPin className="h-3 w-3" />
                          {request.properties.address}, {request.properties.city}
                        </div>
                        {request.units && (
                          <div className="text-sm ml-6">
                            <span className="font-medium">Unit {request.units.unit_number}</span> - 
                            {request.units.bedrooms} bed, {request.units.bathrooms} bath - 
                            ${Number(request.units.rent_amount).toLocaleString()}/month
                          </div>
                        )}
                        {!request.units && (
                          <div className="text-sm text-muted-foreground ml-6">
                            Any available unit
                          </div>
                        )}
                      </div>

                      {/* Message from tenant */}
                      {request.message && (
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="text-sm font-medium mb-1">Message from tenant:</div>
                              <div className="text-sm">{request.message}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          onClick={() => approveRequest(request)}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectDialog(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedRequest?.profiles?.full_name || 'this user'}'s request? 
              You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason (Optional)</label>
              <Textarea
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rejectRequest}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingRequests;