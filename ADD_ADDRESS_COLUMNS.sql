-- Add address columns to hosts table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

-- Add address fields to hosts table
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS address_1 VARCHAR(255);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS address_2 VARCHAR(255);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS zip VARCHAR(20);

-- Create index for city/state lookups
CREATE INDEX IF NOT EXISTS idx_hosts_city ON hosts(city);
CREATE INDEX IF NOT EXISTS idx_hosts_state ON hosts(state);
