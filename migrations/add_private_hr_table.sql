-- Migration: add_private_hr_table.sql
-- Creates a separate table for Private HR records collected via the Private HR registration form
CREATE TABLE IF NOT EXISTS private_hr (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  full_name TEXT NOT NULL,
  father_name TEXT,
  date_of_birth DATE,
  religion TEXT,
  phone_number TEXT,
  cnic TEXT NOT NULL,
  cnic_issue_date DATE,
  cnic_expiry_date DATE,
  designation TEXT,
  employee_code TEXT,
  salary INTEGER,
  joining_date DATE,
  address TEXT,
  notes TEXT,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_private_hr_cnic ON private_hr(cnic);
CREATE INDEX IF NOT EXISTS idx_private_hr_created_at ON private_hr(created_at);

ALTER TABLE private_hr ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on private_hr" ON private_hr;
CREATE POLICY "Allow all operations on private_hr" ON private_hr FOR ALL USING (true) WITH CHECK (true);
