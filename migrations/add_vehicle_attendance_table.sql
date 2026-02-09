-- Create vehicle attendance table
CREATE TABLE IF NOT EXISTS vehicle_attendance (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL REFERENCES vehicle_registrations(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Absent' CHECK (status IN ('Present', 'Absent', 'Maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vehicle_id, attendance_date)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_date ON vehicle_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_vehicle_id ON vehicle_attendance(vehicle_id);

-- Enable RLS
ALTER TABLE vehicle_attendance ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
DROP POLICY IF EXISTS "Allow all operations on vehicle_attendance" ON vehicle_attendance;
CREATE POLICY "Allow all operations on vehicle_attendance" 
    ON vehicle_attendance FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
