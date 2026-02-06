-- Add priority_score column to call_queue (the code references this, not 'priority')
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

ALTER TABLE call_queue ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'call_queue'
ORDER BY ordinal_position;
