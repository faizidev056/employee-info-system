-- Create fleet_mileage_reports table
CREATE TABLE IF NOT EXISTS public.fleet_mileage_reports (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  reg_no VARCHAR(50) NOT NULL,
  vehicle_type VARCHAR(100),
  used_for VARCHAR(100),
  mileage NUMERIC(10, 2),
  ignition_time NUMERIC(8, 2),
  threshold NUMERIC(10, 2),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, reg_no)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fleet_mileage_reports_date ON public.fleet_mileage_reports(date);
CREATE INDEX IF NOT EXISTS idx_fleet_mileage_reports_reg_no ON public.fleet_mileage_reports(reg_no);

-- Enable Row Level Security
ALTER TABLE public.fleet_mileage_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.fleet_mileage_reports
  FOR SELECT
  USING (auth.role() = 'authenticated_user');

CREATE POLICY "Enable write access for authenticated users" ON public.fleet_mileage_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "Enable update for authenticated users" ON public.fleet_mileage_reports
  FOR UPDATE
  USING (auth.role() = 'authenticated_user');

CREATE POLICY "Enable delete for authenticated users" ON public.fleet_mileage_reports
  FOR DELETE
  USING (auth.role() = 'authenticated_user');
