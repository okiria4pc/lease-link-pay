-- Add foreign key constraint for properties.landlord_id to reference profiles.user_id
ALTER TABLE properties 
ADD CONSTRAINT properties_landlord_id_fkey 
FOREIGN KEY (landlord_id) REFERENCES profiles(user_id) ON DELETE CASCADE;