-- First let's see what foreign key constraints exist on tenancies table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='tenancies';

-- Create the missing tenancy record directly
INSERT INTO tenancies (
  tenant_id,
  unit_id,
  rent_amount,
  start_date,
  status
) VALUES (
  '311e0329-e229-4c4b-be0a-eaba0fe0cb25',
  '9b041d43-defa-40bc-a187-e493d0547017', 
  (SELECT rent_amount FROM units WHERE id = '9b041d43-defa-40bc-a187-e493d0547017'),
  CURRENT_DATE,
  'active'
);

-- Update the unit status to occupied
UPDATE units 
SET status = 'occupied' 
WHERE id = '9b041d43-defa-40bc-a187-e493d0547017';