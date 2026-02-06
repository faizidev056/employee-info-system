-- Create attendance_monthly table to store month-wise attendance as JSON per worker
CREATE TABLE IF NOT EXISTS attendance_monthly (
  id BIGSERIAL PRIMARY KEY,
  worker_id BIGINT REFERENCES workers(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- format: YYYY-MM
  attendance_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, month)
);

CREATE INDEX IF NOT EXISTS idx_attendance_month ON attendance_monthly(month);
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance_monthly(worker_id);

-- Enable Row Level Security
ALTER TABLE attendance_monthly ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all authenticated users to read/write
DROP POLICY IF EXISTS "Allow authenticated access" ON attendance_monthly;
CREATE POLICY "Allow authenticated access" ON attendance_monthly
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_attendance_updated_at ON attendance_monthly;
CREATE TRIGGER trg_update_attendance_updated_at
BEFORE UPDATE ON attendance_monthly
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();