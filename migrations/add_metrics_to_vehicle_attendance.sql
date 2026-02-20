-- Add mileage and ignition_time columns to vehicle_attendance table
ALTER TABLE vehicle_attendance 
ADD COLUMN IF NOT EXISTS mileage NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS ignition_time NUMERIC(8, 2);

-- Update the indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_metrics ON vehicle_attendance (vehicle_id, attendance_date);
