-- Create the missing tenancy record for the approved join request
INSERT INTO tenancies (
  tenant_id,
  unit_id,
  rent_amount,
  start_date,
  status
)
SELECT 
  jr.tenant_id,
  jr.unit_id,
  u.rent_amount,
  CURRENT_DATE,
  'active'
FROM join_requests jr
JOIN units u ON u.id = jr.unit_id
WHERE jr.status = 'approved'
  AND jr.tenant_id = '311e0329-e229-4c4b-be0a-eaba0fe0cb25'
  AND NOT EXISTS (
    SELECT 1 FROM tenancies t 
    WHERE t.tenant_id = jr.tenant_id 
    AND t.unit_id = jr.unit_id
  );

-- Update the unit status to occupied
UPDATE units 
SET status = 'occupied' 
WHERE id = '9b041d43-defa-40bc-a187-e493d0547017';