-- Fix infinite recursion in tenancies RLS policies
-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "Landlords can manage tenancies" ON tenancies;
DROP POLICY IF EXISTS "Tenants can view their tenancies" ON tenancies;
DROP POLICY IF EXISTS "Users can manage relevant payments" ON payments;

-- Create simpler, non-recursive policies for tenancies
CREATE POLICY "Tenants can view own tenancies" 
ON tenancies FOR SELECT 
USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can update own tenancies" 
ON tenancies FOR UPDATE 
USING (tenant_id = auth.uid());

CREATE POLICY "Landlords can manage tenancies" 
ON tenancies FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties p ON p.id = u.property_id 
    WHERE u.id = tenancies.unit_id 
    AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all tenancies" 
ON tenancies FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create simpler payment policies
CREATE POLICY "Tenants can manage own payments" 
ON payments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM tenancies t 
    WHERE t.id = payments.tenancy_id 
    AND t.tenant_id = auth.uid()
  )
);

CREATE POLICY "Landlords can manage tenant payments" 
ON payments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM tenancies t
    JOIN units u ON u.id = t.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE t.id = payments.tenancy_id 
    AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all payments" 
ON payments FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');