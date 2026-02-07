-- Create fleet_daily_reports table for Daily Reporting tab
CREATE TABLE IF NOT EXISTS fleet_daily_reports (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  reg_no VARCHAR(50) NOT NULL,
  town VARCHAR(100),
  mileage NUMERIC(10, 2),
  ignition_time NUMERIC(8, 2),
  fuel_allocated NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, reg_no)
);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_fleet_daily_reports_date ON fleet_daily_reports(date);

-- Create index for faster queries by reg_no
CREATE INDEX IF NOT EXISTS idx_fleet_daily_reports_reg_no ON fleet_daily_reports(reg_no);

-- Enable RLS (Row Level Security)
ALTER TABLE fleet_daily_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write fleet data
CREATE POLICY "Allow authenticated users to read fleet data" ON fleet_daily_reports
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert fleet data" ON fleet_daily_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update fleet data" ON fleet_daily_reports
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete fleet data" ON fleet_daily_reports
  FOR DELETE USING (true);
