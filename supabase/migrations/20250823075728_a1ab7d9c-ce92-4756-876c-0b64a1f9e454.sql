-- Fix the remaining recursive policy on properties table
DROP POLICY IF EXISTS "Tenants can view properties of their units" ON properties;
DROP POLICY IF EXISTS "Landlords can manage their properties" ON properties;

-- Create simple, non-recursive policies for properties
CREATE POLICY "Landlords can manage own properties" 
ON properties FOR ALL 
USING (landlord_id = auth.uid());

CREATE POLICY "Tenants can view their rented properties" 
ON properties FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM units u 
    JOIN tenancies t ON t.unit_id = u.id 
    WHERE u.property_id = properties.id 
    AND t.tenant_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all properties" 
ON properties FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');