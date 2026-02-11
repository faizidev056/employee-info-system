-- Create vehicle_attendance table
CREATE TABLE IF NOT EXISTS public.vehicle_attendance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES public.vehicle_registrations(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Maintenance')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, attendance_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_vehicle_id ON public.vehicle_attendance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_date ON public.vehicle_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_attendance_status ON public.vehicle_attendance(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vehicle_attendance ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all attendance records
CREATE POLICY "Allow authenticated users to read vehicle attendance"
    ON public.vehicle_attendance
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow authenticated users to insert attendance records
CREATE POLICY "Allow authenticated users to insert vehicle attendance"
    ON public.vehicle_attendance
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy to allow authenticated users to update attendance records
CREATE POLICY "Allow authenticated users to update vehicle attendance"
    ON public.vehicle_attendance
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy to allow authenticated users to delete attendance records
CREATE POLICY "Allow authenticated users to delete vehicle attendance"
    ON public.vehicle_attendance
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comment to table
COMMENT ON TABLE public.vehicle_attendance IS 'Stores daily attendance records for vehicles';
COMMENT ON COLUMN public.vehicle_attendance.vehicle_id IS 'Foreign key to vehicle_registrations table';
COMMENT ON COLUMN public.vehicle_attendance.attendance_date IS 'Date of attendance record';
COMMENT ON COLUMN public.vehicle_attendance.status IS 'Attendance status: Present, Absent, or Maintenance';
COMMENT ON COLUMN public.vehicle_attendance.updated_at IS 'Timestamp of last update';
COMMENT ON COLUMN public.vehicle_attendance.created_at IS 'Timestamp of record creation';
