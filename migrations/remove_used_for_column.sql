-- remove_used_for_column.sql
-- Removes used_for column from vehicle_registrations table
-- This reverses the add_used_for_column migration as the field is no longer needed

ALTER TABLE IF EXISTS vehicle_registrations DROP COLUMN IF EXISTS used_for;
