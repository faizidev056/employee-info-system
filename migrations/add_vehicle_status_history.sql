-- Migration: add_vehicle_status_history.sql
CREATE TABLE IF NOT EXISTS vehicle_status_history (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicle_registrations(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicle_status_history_vehicle_id ON vehicle_status_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_status_history_changed_at ON vehicle_status_history(changed_at);

ALTER TABLE vehicle_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on vehicle_status_history" ON vehicle_status_history;
CREATE POLICY "Allow all operations on vehicle_status_history" ON vehicle_status_history FOR ALL USING (true) WITH CHECK (true);
