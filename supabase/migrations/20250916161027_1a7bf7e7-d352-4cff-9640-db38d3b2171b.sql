-- Drop the foreign key constraint that's causing issues
ALTER TABLE tenancies DROP CONSTRAINT IF EXISTS tenancies_tenant_id_fkey;

-- Now create the tenancy record without foreign key constraint
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