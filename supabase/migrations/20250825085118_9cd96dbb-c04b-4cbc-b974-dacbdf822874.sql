-- Create join_request_status enum
CREATE TYPE join_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create join_requests table
CREATE TABLE join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  status join_request_status DEFAULT 'pending',
  message TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, property_id, unit_id) -- Prevent duplicate requests
);

-- Enable RLS on join_requests
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for join_requests
-- Tenants can view and create their own requests
CREATE POLICY "tenants_can_manage_own_requests" ON join_requests 
FOR ALL USING (tenant_id = auth.uid());

-- Landlords can view and update requests for their properties
CREATE POLICY "landlords_can_manage_property_requests" ON join_requests 
FOR ALL USING (
  property_id IN (
    SELECT id FROM properties WHERE landlord_id = auth.uid()
  ) OR get_user_role(auth.uid()) = 'admin'
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_join_requests_updated_at_trigger
  BEFORE UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_join_requests_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_join_requests_tenant_id ON join_requests(tenant_id);
CREATE INDEX idx_join_requests_property_id ON join_requests(property_id);
CREATE INDEX idx_join_requests_status ON join_requests(status);

-- Enable realtime for join_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE join_requests;