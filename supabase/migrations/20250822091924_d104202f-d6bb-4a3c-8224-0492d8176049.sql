-- Drop the conflicting foreign key constraint that references profiles(id)
-- Keep the one that references profiles(user_id) since PropertyForm uses profile.user_id
ALTER TABLE properties 
DROP CONSTRAINT properties_landlord_id_fkey;