-- Migration to add tracked_medicines table
CREATE TABLE tracked_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,  -- for anonymous users
  medicine_id TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  batch_number TEXT,
  expiry_date DATE NOT NULL,
  notified_7d BOOLEAN DEFAULT FALSE,
  notified_14d BOOLEAN DEFAULT FALSE,
  notified_30d BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracked_expiry ON tracked_medicines(expiry_date);
CREATE INDEX idx_tracked_user ON tracked_medicines(user_id);
CREATE INDEX idx_tracked_session ON tracked_medicines(session_id);

ALTER TABLE tracked_medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracked_medicines_user_manage"
    ON tracked_medicines
    FOR ALL
    USING (user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL))
    WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL));

CREATE POLICY "tracked_medicines_service_access"
    ON tracked_medicines
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
