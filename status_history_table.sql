-- Create status_history table to track employee status changes
CREATE TABLE IF NOT EXISTS status_history (
  id BIGSERIAL PRIMARY KEY,
  worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_status_history_worker_id ON status_history(worker_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON status_history(changed_at DESC);

-- Optional: Enable RLS (Row Level Security) if needed
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read
CREATE POLICY "Enable read access for all users" ON status_history
  FOR SELECT USING (true);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Enable insert for all users" ON status_history
  FOR INSERT WITH CHECK (true);
