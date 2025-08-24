-- Drop all problematic policies and recreate them without circular references
DROP POLICY IF EXISTS "Tenants can view their rented properties" ON properties;
DROP POLICY IF EXISTS "Tenants can view their rented units" ON units;
DROP POLICY IF EXISTS "Landlords can manage tenancies" ON tenancies;
DROP POLICY IF EXISTS "Tenants can manage own payments" ON payments;
DROP POLICY IF EXISTS "Landlords can manage tenant payments" ON payments;

-- Create simple, non-recursive policies for properties
-- Only landlords need to manage properties, tenants will access through direct relationships
CREATE POLICY "Landlords can manage own properties" 
ON properties FOR ALL 
USING (landlord_id = auth.uid());

CREATE POLICY "Admins can manage all properties" 
ON properties FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create simple policies for units - only reference properties (no tenancies)
CREATE POLICY "Property owners can manage their units" 
ON units FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = units.property_id 
    AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all units" 
ON units FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create simple policies for tenancies - direct user checks only
CREATE POLICY "Tenants can view own tenancies" 
ON tenancies FOR SELECT 
USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can update own tenancies" 
ON tenancies FOR UPDATE 
USING (tenant_id = auth.uid());

CREATE POLICY "Property owners can manage tenancies for their properties" 
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

-- Create simple payment policies - only reference tenancies directly
CREATE POLICY "Users can manage their tenancy payments" 
ON payments FOR ALL 
USING (
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

CREATE POLICY "Admins can manage all payments" 
ON payments FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');