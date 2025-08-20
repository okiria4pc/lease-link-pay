-- First, create user role enum if it doesn't exist
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('landlord', 'tenant', 'admin');

-- Update profiles table to use the enum
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraints
ALTER TABLE properties ADD CONSTRAINT fk_properties_landlord 
  FOREIGN KEY (landlord_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE units ADD CONSTRAINT fk_units_property 
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

ALTER TABLE tenancies ADD CONSTRAINT fk_tenancies_tenant 
  FOREIGN KEY (tenant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE tenancies ADD CONSTRAINT fk_tenancies_unit 
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

ALTER TABLE payments ADD CONSTRAINT fk_payments_tenancy 
  FOREIGN KEY (tenancy_id) REFERENCES tenancies(id) ON DELETE CASCADE;

ALTER TABLE expenses ADD CONSTRAINT fk_expenses_property 
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_tenant 
  FOREIGN KEY (tenant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE maintenance_requests ADD CONSTRAINT fk_maintenance_unit 
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE user_id = user_uuid;
$$;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for properties
CREATE POLICY "Landlords can manage their properties" ON properties
  FOR ALL USING (
    auth.uid() = landlord_id OR 
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Tenants can view properties of their units" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      JOIN units u ON u.id = t.unit_id
      WHERE u.property_id = properties.id 
      AND t.tenant_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) IN ('admin', 'landlord')
  );

-- Create RLS policies for units
CREATE POLICY "Property owners can manage units" ON units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.id = units.property_id 
      AND (p.landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin')
    )
  );

CREATE POLICY "Tenants can view their units" ON units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenancies t 
      WHERE t.unit_id = units.id 
      AND t.tenant_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) IN ('admin', 'landlord')
  );

-- Create RLS policies for tenancies
CREATE POLICY "Landlords can manage tenancies" ON tenancies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      WHERE u.id = tenancies.unit_id 
      AND (p.landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin')
    )
  );

CREATE POLICY "Tenants can view their tenancies" ON tenancies
  FOR SELECT USING (
    tenant_id = auth.uid() OR
    get_user_role(auth.uid()) IN ('admin', 'landlord')
  );

-- Create RLS policies for payments
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
    get_user_role(auth.uid()) = 'admin'
  );

-- Create RLS policies for expenses
CREATE POLICY "Property owners can manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.id = expenses.property_id 
      AND (p.landlord_id = auth.uid() OR get_user_role(auth.uid()) = 'admin')
    )
  );

-- Create RLS policies for maintenance requests
CREATE POLICY "Users can manage relevant maintenance requests" ON maintenance_requests
  FOR ALL USING (
    tenant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM units u
      JOIN properties p ON p.id = u.property_id
      WHERE u.id = maintenance_requests.unit_id 
      AND p.landlord_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();