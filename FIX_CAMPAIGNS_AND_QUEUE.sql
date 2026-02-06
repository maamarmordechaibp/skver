-- FIX CAMPAIGNS TABLE AND CREATE CALL_QUEUE
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

-- 1. Add updated_at column to campaigns if missing
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add beds_needed column to campaigns if missing
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS beds_needed INT DEFAULT 20;

-- 2b. Add address columns to hosts if missing
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS address_1 VARCHAR(255);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS address_2 VARCHAR(255);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS zip VARCHAR(20);

-- 2c. Fix location_type constraint to allow NULL or default
ALTER TABLE hosts ALTER COLUMN location_type SET DEFAULT 'home';
ALTER TABLE hosts DROP CONSTRAINT IF EXISTS hosts_location_type_check;
ALTER TABLE hosts ADD CONSTRAINT hosts_location_type_check CHECK (location_type IS NULL OR location_type IN ('private', 'home'));

-- 3. Drop any problematic trigger and recreate properly
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
DROP FUNCTION IF EXISTS update_campaigns_timestamp CASCADE;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_timestamp();

-- 4. Create call_queue table for managing outbound call queue
CREATE TABLE IF NOT EXISTS call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'skipped', 'failed', 'no_answer')),
  priority INT DEFAULT 0,
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, host_id)
);

-- Add indexes for call_queue
CREATE INDEX IF NOT EXISTS idx_call_queue_campaign ON call_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_queue_status ON call_queue(status);
CREATE INDEX IF NOT EXISTS idx_call_queue_host ON call_queue(host_id);

-- 5. Create call_logs table if missing
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid VARCHAR(255),
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  direction VARCHAR(20),
  host_id UUID REFERENCES hosts(id),
  campaign_id UUID REFERENCES campaigns(id),
  status VARCHAR(50),
  duration INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_host ON call_logs(host_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_campaign ON call_logs(campaign_id);

-- Verify all tables
SELECT 'campaigns columns:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' AND table_schema = 'public';

-- 6. Fix call_logs foreign key to use SET NULL on delete (so deleting hosts doesn't fail)
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_host_id_fkey;
ALTER TABLE call_logs ADD CONSTRAINT call_logs_host_id_fkey 
  FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE SET NULL;

ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_campaign_id_fkey;
ALTER TABLE call_logs ADD CONSTRAINT call_logs_campaign_id_fkey 
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

SELECT 'call_queue created!' as status;
