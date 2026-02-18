-- Migration: add termination_date to vehicle_registrations
-- Run this in your Supabase SQL Editor

ALTER TABLE vehicle_registrations
  ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicle_registrations'
ORDER BY ordinal_position;
