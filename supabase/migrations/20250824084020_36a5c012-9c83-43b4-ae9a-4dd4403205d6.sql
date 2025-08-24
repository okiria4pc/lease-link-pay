-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Landlords can manage own properties" ON properties;
DROP POLICY IF EXISTS "Property owners can manage their units" ON units;
DROP POLICY IF EXISTS "Admins can manage all properties" ON properties;
DROP POLICY IF EXISTS "Admins can manage all units" ON units;
DROP POLICY IF EXISTS "Admins can manage all tenancies" ON tenancies;
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;

-- Now recreate simplified policies without circular references
CREATE POLICY "Landlords manage properties" 
ON properties FOR ALL 
USING (landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Property owners manage units" 
ON units FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = units.property_id 
    AND (p.landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin')
  )
);

-- Simplified tenancy policies without cross-references
CREATE POLICY "Direct tenancy access" 
ON tenancies FOR ALL 
USING (
  tenant_id = auth.uid() OR 
  get_user_role(auth.uid()) = 'admin' OR
  EXISTS (
    SELECT 1 FROM units u 
    JOIN properties p ON p.id = u.property_id 
    WHERE u.id = tenancies.unit_id AND p.landlord_id = auth.uid()
  )
);

-- Simplified payment policies
CREATE POLICY "Payment access" 
ON payments FOR ALL 
USING (
  get_user_role(auth.uid()) = 'admin' OR
  EXISTS (
    SELECT 1 FROM tenancies t 
    WHERE t.id = payments.tenancy_id 
    AND (t.tenant_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM units u 
           JOIN properties p ON p.id = u.property_id 
           WHERE u.id = t.unit_id AND p.landlord_id = auth.uid()
         ))
  )
);