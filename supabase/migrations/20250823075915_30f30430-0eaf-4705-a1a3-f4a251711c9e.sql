-- Fix recursive policy on units table
DROP POLICY IF EXISTS "Tenants can view their units" ON units;
DROP POLICY IF EXISTS "Property owners can manage units" ON units;

-- Create simple, non-recursive policies for units
CREATE POLICY "Property owners can manage their units" 
ON units FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = units.property_id 
    AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Tenants can view their rented units" 
ON units FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM tenancies t 
    WHERE t.unit_id = units.id 
    AND t.tenant_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all units" 
ON units FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');