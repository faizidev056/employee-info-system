-- Migration: add_private_hr_status_and_history.sql
-- Adds a `status` column to `private_hr` and creates a status history table

-- 1) Add `status` column (default 'Active')
ALTER TABLE IF EXISTS private_hr
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 2) Create history table for private_hr status changes
CREATE TABLE IF NOT EXISTS private_hr_status_history (
  id BIGSERIAL PRIMARY KEY,
  private_hr_id BIGINT NOT NULL REFERENCES private_hr(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  changed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_private_hr_status_history_private_hr_id ON private_hr_status_history(private_hr_id);
CREATE INDEX IF NOT EXISTS idx_private_hr_status_history_changed_at ON private_hr_status_history(changed_at);

ALTER TABLE private_hr_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on private_hr_status_history" ON private_hr_status_history;
CREATE POLICY "Allow all operations on private_hr_status_history" ON private_hr_status_history FOR ALL USING (true) WITH CHECK (true);
