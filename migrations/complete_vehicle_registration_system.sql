-- complete_vehicle_registration_system.sql
-- Complete solution: stores the ENTIRE registration form in one atomic transaction
-- This is the only migration you need to run for vehicle registration

-- 1. Counter table (for atomic sequence generation per vehicle type)
CREATE TABLE IF NOT EXISTS registration_counters (
  type_code TEXT PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0
);

-- 2. Complete vehicle_registrations table - stores ALL form fields
CREATE TABLE IF NOT EXISTS vehicle_registrations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Form fields: all stored exactly as submitted
  sr TEXT,
  reg_id TEXT UNIQUE NOT NULL,
  reg_no TEXT NOT NULL,
  type TEXT NOT NULL,
  type_code TEXT NOT NULL,
  vehicle_code TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  owned_by_type TEXT DEFAULT 'Contractor',
  owned_by TEXT,
  joining_date DATE,
  status TEXT DEFAULT 'Active',
  used_for VARCHAR(100)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_vehicle_registrations_type_code ON vehicle_registrations(type_code);
CREATE INDEX IF NOT EXISTS idx_vehicle_registrations_reg_id ON vehicle_registrations(reg_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_registrations_reg_no ON vehicle_registrations(reg_no);
CREATE INDEX IF NOT EXISTS idx_vehicle_registrations_created_at ON vehicle_registrations(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_registrations_vehicle_code ON vehicle_registrations(vehicle_code);

-- 3. ATOMIC RPC: register_vehicle
-- Inputs: ALL form fields from RegistrationForm.jsx
-- Output: JSON containing inserted row + generated reg_id + vehicle_code
-- One transaction: reserve sequence + insert all form data + return results

DROP FUNCTION IF EXISTS public.register_vehicle(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DATE, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.register_vehicle(
  p_type TEXT,
  p_type_code TEXT,
  p_reg_no TEXT,
  p_make TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_owned_by_type TEXT DEFAULT 'Contractor',
  p_owned_by TEXT DEFAULT NULL,
  p_joining_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT 'Active',
  p_sr TEXT DEFAULT NULL,
  p_vehicle_code_suffix TEXT DEFAULT NULL,
  p_used_for TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE
  max_seq_from_rows INTEGER := 0;
  max_seq_from_legacy INTEGER := 0;
  new_seq INTEGER;
  regid TEXT;
  vehicle_code TEXT;
  code_suffix TEXT;
  generated_sr TEXT;
  inserted_row vehicle_registrations%ROWTYPE;
BEGIN
  -- Step 1: Find max sequence in vehicle_registrations for this type_code
  SELECT COALESCE(MAX((substring(reg_id from 'ZKB-' || p_type_code || '/([0-9]+)$'))::int), 0)
    INTO max_seq_from_rows
    FROM vehicle_registrations
    WHERE type_code = p_type_code;

  -- Step 2: Also check legacy `vehicles` table if it exists (for data migration)
  BEGIN
    SELECT COALESCE(MAX((substring(reg_id from 'ZKB-' || p_type_code || '/([0-9]+)$'))::int), 0)
      INTO max_seq_from_legacy
      FROM vehicles
      WHERE reg_id IS NOT NULL
      AND (substring(reg_id from 'ZKB-' || p_type_code || '/([0-9]+)$')) IS NOT NULL;
  EXCEPTION WHEN undefined_table THEN
    max_seq_from_legacy := 0;
  END;

  -- Step 3: Use the higher of the two maxes
  IF max_seq_from_legacy > max_seq_from_rows THEN
    max_seq_from_rows := max_seq_from_legacy;
  END IF;

  -- Step 4: Atomically reserve the next sequence
  -- UPSERT: increment counter, but ensure it's at least max_seq_from_rows + 1
  INSERT INTO registration_counters (type_code, seq)
    VALUES (p_type_code, max_seq_from_rows + 1)
  ON CONFLICT (type_code) DO UPDATE
    SET seq = GREATEST(registration_counters.seq + 1, max_seq_from_rows + 1)
  RETURNING seq INTO new_seq;

  -- Step 5: Generate Reg-ID, Vehicle Code, and Serial Number using the reserved sequence
  regid := format('ZKB-%s/%s', p_type_code, lpad(new_seq::text, 3, '0'));
  
  -- Use provided vehicle_code_suffix or generate default (e.g., 001, 002)
  code_suffix := COALESCE(p_vehicle_code_suffix, lpad(new_seq::text, 3, '0'));
  vehicle_code := format('HND-%s-%s', p_type_code, code_suffix);
  
  -- Auto-generate serial number as just digits (if not provided)
  -- Format: 1, 2, 3, 4, etc. (just the sequence number)
  generated_sr := COALESCE(p_sr, new_seq::text);

  -- Step 6: INSERT the ENTIRE form into vehicle_registrations
  INSERT INTO vehicle_registrations (
    sr, reg_id, reg_no, type, type_code, vehicle_code, 
    make, model, year, owned_by_type, owned_by, joining_date, status, used_for
  ) VALUES (
    generated_sr, regid, p_reg_no, p_type, p_type_code, vehicle_code,
    p_make, p_model, p_year, p_owned_by_type, p_owned_by, p_joining_date, p_status, p_used_for
  )
  RETURNING * INTO inserted_row;

  -- Step 7: Return the inserted row + generated codes as JSON
  RETURN json_build_object(
    'row', row_to_json(inserted_row),
    'reg_id', regid,
    'seq', new_seq,
    'vehicle_code', vehicle_code,
    'sr', generated_sr
  );
END;
$$;

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.register_vehicle(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 5. Enable RLS and allow all operations (adjust for your auth model)
ALTER TABLE vehicle_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON vehicle_registrations;
CREATE POLICY "Allow all operations" ON vehicle_registrations FOR ALL USING (true);

-- 6. Test query: View what's stored
-- SELECT * FROM vehicle_registrations ORDER BY created_at DESC LIMIT 10;

-- End of complete registration system
