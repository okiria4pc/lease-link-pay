-- Add a SELECT policy for units of searchable properties
-- This allows tenants to see units when searching for properties to join
CREATE POLICY "Enable read access for units of searchable properties" 
ON public.units 
FOR SELECT 
USING (
  property_id IN (
    SELECT id FROM properties WHERE is_searchable = true
  )
);