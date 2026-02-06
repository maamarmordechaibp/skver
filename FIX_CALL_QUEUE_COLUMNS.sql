-- Fix call_queue table: add missing columns
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'call_queue'
ORDER BY ordinal_position;
