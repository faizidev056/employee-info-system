-- Create private_attendance_monthly table to store month-wise attendance for Private HR staff
-- This separates private attendance from standard HR to avoid foreign key conflicts

CREATE TABLE IF NOT EXISTS private_attendance_monthly (
  id BIGSERIAL PRIMARY KEY,
  worker_id BIGINT REFERENCES private_hr(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- format: YYYY-MM
  attendance_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, month)
);

CREATE INDEX IF NOT EXISTS idx_private_attendance_month ON private_attendance_monthly(month);
CREATE INDEX IF NOT EXISTS idx_private_attendance_worker ON private_attendance_monthly(worker_id);

-- Enable Row Level Security
ALTER TABLE private_attendance_monthly ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for now as per project pattern)
DROP POLICY IF EXISTS "Allow authenticated access" ON private_attendance_monthly;
CREATE POLICY "Allow authenticated access" ON private_attendance_monthly
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_private_attendance_updated_at ON private_attendance_monthly;
CREATE TRIGGER trg_update_private_attendance_updated_at
BEFORE UPDATE ON private_attendance_monthly
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
