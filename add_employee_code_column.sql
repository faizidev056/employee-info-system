-- Add employee_code column to workers table (nullable initially to avoid duplicate defaults)
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50) UNIQUE;

-- Create index on employee_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_workers_employee_code ON workers(employee_code);

-- Add check constraint to ensure proper format
ALTER TABLE workers 
ADD CONSTRAINT chk_employee_code_format 
CHECK (employee_code IS NULL OR employee_code ~ '^ZKB/(H|SS|SW|D)/\d{3}$');
