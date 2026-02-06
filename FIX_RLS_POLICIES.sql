-- Fix RLS policies to allow service_role full CRUD access
-- AND allow anon to read + write (needed for edge functions using REST API)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

-- ==========================================
-- ENSURE UUID EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update hosts table default to use gen_random_uuid() as fallback
ALTER TABLE hosts ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ==========================================
-- HOSTS TABLE
-- ==========================================
-- Allow service_role full access (edge functions)
DROP POLICY IF EXISTS "Service role full access hosts" ON hosts;
CREATE POLICY "Service role full access hosts" ON hosts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow anon to insert/update (edge functions use anon key sometimes)
DROP POLICY IF EXISTS "Allow insert hosts" ON hosts;
CREATE POLICY "Allow insert hosts" ON hosts
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update hosts" ON hosts;
CREATE POLICY "Allow update hosts" ON hosts
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ==========================================
-- CAMPAIGNS TABLE
-- ==========================================
DROP POLICY IF EXISTS "Service role full access campaigns" ON campaigns;
CREATE POLICY "Service role full access campaigns" ON campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert campaigns" ON campaigns;
CREATE POLICY "Allow insert campaigns" ON campaigns
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update campaigns" ON campaigns;
CREATE POLICY "Allow update campaigns" ON campaigns
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ==========================================
-- CALL_LOGS TABLE (may be call_history in some setups)
-- ==========================================
DO $$ BEGIN
  -- call_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs') THEN
    ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow public read call_logs" ON call_logs;
    CREATE POLICY "Allow public read call_logs" ON call_logs FOR SELECT TO anon USING (true);
    
    DROP POLICY IF EXISTS "Service role full access call_logs" ON call_logs;
    CREATE POLICY "Service role full access call_logs" ON call_logs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow insert call_logs" ON call_logs;
    CREATE POLICY "Allow insert call_logs" ON call_logs
      FOR INSERT TO anon WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow update call_logs" ON call_logs;
    CREATE POLICY "Allow update call_logs" ON call_logs
      FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- call_history
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_history') THEN
    DROP POLICY IF EXISTS "Service role full access call_history" ON call_history;
    CREATE POLICY "Service role full access call_history" ON call_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow insert call_history" ON call_history;
    CREATE POLICY "Allow insert call_history" ON call_history
      FOR INSERT TO anon WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow update call_history" ON call_history;
    CREATE POLICY "Allow update call_history" ON call_history
      FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==========================================
-- CALL_QUEUE TABLE
-- ==========================================
DROP POLICY IF EXISTS "Service role full access call_queue" ON call_queue;
CREATE POLICY "Service role full access call_queue" ON call_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert call_queue" ON call_queue;
CREATE POLICY "Allow insert call_queue" ON call_queue
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update call_queue" ON call_queue;
CREATE POLICY "Allow update call_queue" ON call_queue
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete call_queue" ON call_queue;
CREATE POLICY "Allow delete call_queue" ON call_queue
  FOR DELETE TO anon USING (true);

-- ==========================================
-- RESPONSES TABLE
-- ==========================================
DROP POLICY IF EXISTS "Service role full access responses" ON responses;
CREATE POLICY "Service role full access responses" ON responses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert responses" ON responses;
CREATE POLICY "Allow insert responses" ON responses
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update responses" ON responses;
CREATE POLICY "Allow update responses" ON responses
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ==========================================
-- SYSTEM_RECORDINGS TABLE
-- ==========================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_recordings') THEN
    ALTER TABLE system_recordings ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow public read system_recordings" ON system_recordings;
    CREATE POLICY "Allow public read system_recordings" ON system_recordings
      FOR SELECT TO anon USING (true);
    
    DROP POLICY IF EXISTS "Service role full access system_recordings" ON system_recordings;
    CREATE POLICY "Service role full access system_recordings" ON system_recordings
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow insert system_recordings" ON system_recordings;
    CREATE POLICY "Allow insert system_recordings" ON system_recordings
      FOR INSERT TO anon WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow update system_recordings" ON system_recordings;
    CREATE POLICY "Allow update system_recordings" ON system_recordings
      FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Verify policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
