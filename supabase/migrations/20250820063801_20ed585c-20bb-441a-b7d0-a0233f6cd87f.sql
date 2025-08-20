-- Create user role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('landlord', 'tenant', 'admin');
    END IF;
END $$;

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

-- Add foreign key constraints (check if they exist first)
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