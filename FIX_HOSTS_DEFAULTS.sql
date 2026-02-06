-- Quick fix: Add DEFAULT 0 to total_beds column (it's NOT NULL but has no default)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

ALTER TABLE hosts ALTER COLUMN total_beds SET DEFAULT 0;

-- Also add is_private column if it doesn't exist (used by registration)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hosts' AND column_name = 'is_private') THEN
    ALTER TABLE hosts ADD COLUMN is_private BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'hosts'
ORDER BY ordinal_position;
