-- complete_vehicle_registration_system.sql
-- Reflects all RegistrationForm.jsx fields accurately
-- Run this in your Supabase SQL editor (safe to re-run: uses IF NOT EXISTS / OR REPLACE)

-- ============================================================
-- 1. Counter table (atomic sequence per vehicle type)
-- ============================================================
CREATE TABLE IF NOT EXISTS registration_counters (
  type_code TEXT PRIMARY KEY,
  seq       INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 2. vehicle_registrations — mirrors every RegistrationForm field
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_registrations (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Auto-generated identifiers
  sr           TEXT,                          -- e.g. "1", "2", "3"
  reg_id       TEXT UNIQUE NOT NULL,          -- e.g. "ZKB-TT/001"

  -- Basic vehicle info
  reg_no       TEXT NOT NULL,                 -- Government registration number
  type         TEXT NOT NULL,                 -- e.g. "Tractor Trolley"
  type_code    TEXT NOT NULL,                 -- e.g. "TT", "LR", "CP"
  vehicle_code TEXT NOT NULL,                 -- e.g. "HND-TT-001"
  make         TEXT,                          -- e.g. "Toyota", "Hino"
  model        TEXT,                          -- e.g. "Corolla", "500 Series"
  year         INTEGER,                       -- Year of manufacture

  -- Ownership
  owned_by_type  TEXT DEFAULT 'Contractor',   -- "Contractor" | "Local Govt" | "Other"
  owned_by       TEXT,                        -- Owner name (used when owned_by_type = 'Other')
  owner_contact  TEXT,                        -- Owner phone number (optional, Other only)
  owner_cnic     TEXT,                        -- Owner CNIC (optional, Other only)

  -- Dates & status
  joining_date DATE,
  status       TEXT DEFAULT 'Active'          -- "Active" | "Terminated" etc.
);

-- ============================================================
-- 3. Indexes for fast lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vreg_type_code   ON vehicle_registrations(type_code);
CREATE INDEX IF NOT EXISTS idx_vreg_reg_id       ON vehicle_registrations(reg_id);
CREATE INDEX IF NOT EXISTS idx_vreg_reg_no       ON vehicle_registrations(reg_no);
CREATE INDEX IF NOT EXISTS idx_vreg_status       ON vehicle_registrations(status);
CREATE INDEX IF NOT EXISTS idx_vreg_created_at   ON vehicle_registrations(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vreg_vehicle_code ON vehicle_registrations(vehicle_code);

-- ============================================================
-- 4. RPC: register_vehicle  (atomic — one transaction)
--    Inputs  : every field from RegistrationForm.jsx
--    Output  : JSON { row, reg_id, vehicle_code, sr, seq }
-- ============================================================

-- Drop old overloads so the new signature takes effect cleanly
DROP FUNCTION IF EXISTS public.register_vehicle(TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.register_vehicle(TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,DATE,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.register_vehicle(TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT,DATE,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.register_vehicle(
  p_type                TEXT,
  p_type_code           TEXT,
  p_reg_no              TEXT,
  p_make                TEXT    DEFAULT NULL,
  p_model               TEXT    DEFAULT NULL,
  p_year                INTEGER DEFAULT NULL,
  p_owned_by_type       TEXT    DEFAULT 'Contractor',
  p_owned_by            TEXT    DEFAULT NULL,
  p_owner_contact       TEXT    DEFAULT NULL,
  p_owner_cnic          TEXT    DEFAULT NULL,
  p_joining_date        DATE    DEFAULT NULL,
  p_status              TEXT    DEFAULT 'Active',
  p_sr                  TEXT    DEFAULT NULL,
  p_vehicle_code_suffix TEXT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE
  max_seq_from_rows   INTEGER := 0;
  max_seq_from_legacy INTEGER := 0;
  new_seq             INTEGER;
  regid               TEXT;
  v_vehicle_code      TEXT;
  code_suffix         TEXT;
  generated_sr        TEXT;
  inserted_row        vehicle_registrations%ROWTYPE;
BEGIN
  -- Step 1: Find the highest existing sequence for this type_code
  SELECT COALESCE(
    MAX((substring(reg_id FROM 'ZKB-' || p_type_code || '/([0-9]+)$'))::int), 0
  )
  INTO max_seq_from_rows
  FROM vehicle_registrations
  WHERE type_code = p_type_code;

  -- Step 2: Also check legacy `vehicles` table (graceful fallback)
  BEGIN
    SELECT COALESCE(
      MAX((substring(reg_id FROM 'ZKB-' || p_type_code || '/([0-9]+)$'))::int), 0
    )
    INTO max_seq_from_legacy
    FROM vehicles
    WHERE reg_id IS NOT NULL
      AND (substring(reg_id FROM 'ZKB-' || p_type_code || '/([0-9]+)$')) IS NOT NULL;
  EXCEPTION WHEN undefined_table THEN
    max_seq_from_legacy := 0;
  END;

  -- Step 3: Use whichever max is higher
  IF max_seq_from_legacy > max_seq_from_rows THEN
    max_seq_from_rows := max_seq_from_legacy;
  END IF;

  -- Step 4: Atomically reserve the next sequence number
  INSERT INTO registration_counters (type_code, seq)
    VALUES (p_type_code, max_seq_from_rows + 1)
  ON CONFLICT (type_code) DO UPDATE
    SET seq = GREATEST(registration_counters.seq + 1, max_seq_from_rows + 1)
  RETURNING seq INTO new_seq;

  -- Step 5: Build identifiers
  regid          := format('ZKB-%s/%s', p_type_code, lpad(new_seq::text, 3, '0'));
  code_suffix    := COALESCE(p_vehicle_code_suffix, lpad(new_seq::text, 3, '0'));
  v_vehicle_code := format('HND-%s-%s', p_type_code, code_suffix);
  generated_sr   := COALESCE(p_sr, new_seq::text);

  -- Step 6: Insert the full registration record
  INSERT INTO vehicle_registrations (
    sr, reg_id, reg_no,
    type, type_code, vehicle_code,
    make, model, year,
    owned_by_type, owned_by, owner_contact, owner_cnic,
    joining_date, status
  ) VALUES (
    generated_sr, regid, p_reg_no,
    p_type, p_type_code, v_vehicle_code,
    p_make, p_model, p_year,
    p_owned_by_type, p_owned_by, p_owner_contact, p_owner_cnic,
    p_joining_date, p_status
  )
  RETURNING * INTO inserted_row;

  -- Step 7: Return everything the frontend needs
  RETURN json_build_object(
    'row',          row_to_json(inserted_row),
    'reg_id',       regid,
    'seq',          new_seq,
    'vehicle_code', v_vehicle_code,
    'sr',           generated_sr
  );
END;
$$;

-- ============================================================
-- 5. Permissions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.register_vehicle(
  TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER,
  TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT
) TO authenticated;

-- ============================================================
-- 6. Row-Level Security
-- ============================================================
ALTER TABLE vehicle_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON vehicle_registrations;
CREATE POLICY "Allow all operations" ON vehicle_registrations FOR ALL USING (true);

-- ============================================================
-- 7. Migration helper (if upgrading an existing table)
--    Run these only if vehicle_registrations already exists
--    without the new owner columns.
-- ============================================================
-- ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS owner_contact TEXT;
-- ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS owner_cnic    TEXT;

-- ============================================================
-- Verification query
-- SELECT id, sr, reg_id, vehicle_code, type, owned_by_type,
--        owned_by, owner_contact, owner_cnic, status, joining_date
-- FROM vehicle_registrations
-- ORDER BY created_at DESC LIMIT 10;
-- ============================================================
