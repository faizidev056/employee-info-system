-- Supabase table schema for workers
-- Run this SQL in your Supabase SQL editor to create the table

CREATE TABLE workers (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    religion TEXT,
    phone_number TEXT NOT NULL,
    cnic TEXT NOT NULL,
    cnic_issue_date DATE,
    cnic_expiry_date DATE,
    designation TEXT NOT NULL,
    salary INTEGER NOT NULL,
    joining_date DATE NOT NULL,
    uc_ward_id INTEGER NOT NULL,
    uc_ward_name TEXT NOT NULL,
    attendance_point TEXT NOT NULL,
    vehicle_code TEXT,
    address TEXT,
    termination_date DATE,
    status TEXT DEFAULT 'Active' NOT NULL
);

-- Enable Row Level Security
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can make this more restrictive based on your auth needs)
CREATE POLICY "Allow all operations" ON workers FOR ALL USING (true);