-- Make existing properties searchable for testing
UPDATE properties SET is_searchable = true WHERE name LIKE '%SPEKE%' OR name LIKE '%HOOD%';