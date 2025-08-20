-- Fix search path for functions
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenant'::user_role)
  );
  RETURN NEW;
END;
$$;

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_properties_landlord') THEN
        ALTER TABLE properties ADD CONSTRAINT fk_properties_landlord 
          FOREIGN KEY (landlord_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_units_property') THEN
        ALTER TABLE units ADD CONSTRAINT fk_units_property 
          FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_tenancies_tenant') THEN
        ALTER TABLE tenancies ADD CONSTRAINT fk_tenancies_tenant 
          FOREIGN KEY (tenant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_tenancies_unit') THEN
        ALTER TABLE tenancies ADD CONSTRAINT fk_tenancies_unit 
          FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_payments_tenancy') THEN
        ALTER TABLE payments ADD CONSTRAINT fk_payments_tenancy 
          FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_expenses_property') THEN
        ALTER TABLE expenses ADD CONSTRAINT fk_expenses_property 
          FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_maintenance_tenant') THEN
        ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_tenant 
          FOREIGN KEY (tenant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_maintenance_unit') THEN
        ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_unit 
          FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create RLS policies for properties
DROP POLICY IF EXISTS "Landlords can manage their properties" ON properties;
CREATE POLICY "Landlords can manage their properties" ON properties
  FOR ALL USING (
    auth.uid() = landlord_id OR 
    get_user_role(auth.uid()) = 'admin'::user_role
  );

DROP POLICY IF EXISTS "Tenants can view properties of their units" ON properties;
CREATE POLICY "Tenants can view properties of their units" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      JOIN units u ON u.id = t.unit_id
      WHERE u.property_id = properties.id 
      AND t.tenant_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) IN ('admin'::user_role, 'landlord'::user_role)
  );

-- Create RLS policies for units
DROP POLICY IF EXISTS "Property owners can manage units" ON units;
CREATE POLICY "Property owners can manage units" ON units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.id = units.property_id 
      AND (p.landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
    )
  );

DROP POLICY IF EXISTS "Tenants can view their units" ON units;
CREATE POLICY "Tenants can view their units" ON units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t 
      WHERE t.unit_id = units.id 
      AND t.tenant_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) IN ('admin'::user_role, 'landlord'::user_role)
  );

-- Create RLS policies for tenancies
DROP POLICY IF EXISTS "Landlords can manage tenancies" ON tenancies;
CREATE POLICY "Landlords can manage tenancies" ON tenancies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      WHERE u.id = tenancies.unit_id 
      AND (p.landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
    )
  );

DROP POLICY IF EXISTS "Tenants can view their tenancies" ON tenancies;
CREATE POLICY "Tenants can view their tenancies" ON tenancies
  FOR SELECT USING (
    tenant_id = auth.uid() OR
    get_user_role(auth.uid()) IN ('admin'::user_role, 'landlord'::user_role)
  );

-- Create RLS policies for payments
DROP POLICY IF EXISTS "Users can manage relevant payments" ON payments;
CREATE POLICY "Users can manage relevant payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.id = payments.tenancy_id 
      AND (t.tenant_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM units u
             JOIN properties p ON p.id = u.property_id
             WHERE u.id = t.unit_id 
             AND p.landlord_id = auth.uid()
           ))
    ) OR
    get_user_role(auth.uid()) = 'admin'::user_role
  );

-- Create RLS policies for expenses
DROP POLICY IF EXISTS "Property owners can manage expenses" ON expenses;
CREATE POLICY "Property owners can manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.id = expenses.property_id 
      AND (p.landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
    )
  );

-- Create RLS policies for maintenance requests
DROP POLICY IF EXISTS "Users can manage relevant maintenance requests" ON maintenance_requests;
CREATE POLICY "Users can manage relevant maintenance requests" ON maintenance_requests
  FOR ALL USING (
    tenant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      WHERE u.id = maintenance_requests.unit_id 
      AND p.landlord_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'::user_role
  );