-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Landlords manage properties" ON properties;
DROP POLICY IF EXISTS "Property owners manage units" ON units;
DROP POLICY IF EXISTS "Direct tenancy access" ON tenancies; 
DROP POLICY IF EXISTS "Payment access" ON payments;
DROP POLICY IF EXISTS "Tenants can view their rented properties" ON properties;
DROP POLICY IF EXISTS "Tenants can view their rented units" ON units;
DROP POLICY IF EXISTS "Tenants can view own tenancies" ON tenancies;
DROP POLICY IF EXISTS "Tenants can update own tenancies" ON tenancies;
DROP POLICY IF EXISTS "Landlords can manage tenancies" ON tenancies;
DROP POLICY IF EXISTS "Tenants can manage own payments" ON payments;
DROP POLICY IF EXISTS "Landlords can manage tenant payments" ON payments;

-- Create SIMPLE policies without any cross-table references
CREATE POLICY "landlord_properties_access" ON properties FOR ALL 
USING (landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- For units - only check property ownership directly 
CREATE POLICY "landlord_units_access" ON units FOR ALL 
USING (
  property_id IN (
    SELECT id FROM properties WHERE landlord_id = auth.uid()
  ) OR get_user_role(auth.uid()) = 'admin'
);

-- For tenancies - simple tenant access
CREATE POLICY "tenant_tenancies_access" ON tenancies FOR ALL 
USING (tenant_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- For landlord tenancy access - check unit ownership 
CREATE POLICY "landlord_tenancies_access" ON tenancies FOR ALL 
USING (
  unit_id IN (
    SELECT u.id FROM units u 
    WHERE u.property_id IN (
      SELECT p.id FROM properties p WHERE p.landlord_id = auth.uid()
    )
  ) OR get_user_role(auth.uid()) = 'admin'
);

-- For payments - simple access
CREATE POLICY "tenant_payments_access" ON payments FOR ALL 
USING (
  tenancy_id IN (
    SELECT id FROM tenancies WHERE tenant_id = auth.uid()
  ) OR get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "landlord_payments_access" ON payments FOR ALL 
USING (
  tenancy_id IN (
    SELECT t.id FROM tenancies t 
    WHERE t.unit_id IN (
      SELECT u.id FROM units u 
      WHERE u.property_id IN (
        SELECT p.id FROM properties p WHERE p.landlord_id = auth.uid()
      )
    )
  ) OR get_user_role(auth.uid()) = 'admin'
);