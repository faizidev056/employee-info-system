-- add_used_for_column.sql
-- Adds used_for column to vehicle_registrations table to support vehicle usage tracking

ALTER TABLE IF EXISTS vehicle_registrations 
ADD COLUMN IF NOT EXISTS used_for VARCHAR(100);

-- End of migration
