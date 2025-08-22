-- Drop the incorrect foreign key constraint that references profiles(id)
ALTER TABLE properties 
DROP CONSTRAINT properties_landlord_id_fkey;