-- Enable RLS and create policies for dashboard access
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

-- Hosts table policy (allow anonymous read for dashboard)
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read hosts" ON hosts;
CREATE POLICY "Allow public read hosts" ON hosts FOR SELECT TO anon USING (true);

-- Campaigns table policy  
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read campaigns" ON campaigns;
CREATE POLICY "Allow public read campaigns" ON campaigns FOR SELECT TO anon USING (true);

-- Call history table policy
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read call_history" ON call_history;
CREATE POLICY "Allow public read call_history" ON call_history FOR SELECT TO anon USING (true);

-- Call queue table policy
ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read call_queue" ON call_queue;
CREATE POLICY "Allow public read call_queue" ON call_queue FOR SELECT TO anon USING (true);

-- Responses table policy
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read responses" ON responses;
CREATE POLICY "Allow public read responses" ON responses FOR SELECT TO anon USING (true);
