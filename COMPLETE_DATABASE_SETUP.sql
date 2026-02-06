-- Complete Database Setup for Guest House IVR System
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HOSTS TABLE - Store host/volunteer information
-- ============================================
CREATE TABLE IF NOT EXISTS hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) DEFAULT 'Unknown Guest',
  total_beds INTEGER DEFAULT 0,
  location_type VARCHAR(50) DEFAULT 'home',
  call_frequency VARCHAR(20) DEFAULT 'weekly',
  is_registered BOOLEAN DEFAULT false,
  address_1 VARCHAR(255),
  address_2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hosts_phone ON hosts(phone_number);
CREATE INDEX IF NOT EXISTS idx_hosts_city ON hosts(city);
CREATE INDEX IF NOT EXISTS idx_hosts_registered ON hosts(is_registered);

-- ============================================
-- CAMPAIGNS TABLE - Track outbound campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shabbat_date DATE NOT NULL,
  beds_needed INTEGER DEFAULT 0,
  beds_confirmed INTEGER DEFAULT 0,
  custom_message_url TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_date ON campaigns(shabbat_date);

-- ============================================
-- CALL_HISTORY TABLE - Log all calls
-- ============================================
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  host_id UUID REFERENCES hosts(id),
  call_sid VARCHAR(100),
  direction VARCHAR(20) NOT NULL,
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  duration INTEGER,
  status VARCHAR(30),
  recording_url TEXT,
  digits_pressed VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_host ON call_history(host_id);
CREATE INDEX IF NOT EXISTS idx_call_history_campaign ON call_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created ON call_history(created_at DESC);

-- ============================================
-- CALL_QUEUE TABLE - Track outbound call queue
-- ============================================
CREATE TABLE IF NOT EXISTS call_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  host_id UUID REFERENCES hosts(id),
  priority INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_queue_status ON call_queue(status);
CREATE INDEX IF NOT EXISTS idx_call_queue_campaign ON call_queue(campaign_id);

-- ============================================
-- RESPONSES TABLE - Track host responses
-- ============================================
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id),
  host_id UUID REFERENCES hosts(id),
  beds_offered INTEGER DEFAULT 0,
  response_type VARCHAR(20),
  response_method VARCHAR(20),
  notes TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_campaign ON responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_responses_host ON responses(host_id);

-- ============================================
-- RECORDINGS TABLE - Voice recordings/prompts
-- ============================================
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  mp3_url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_by VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_category ON recordings(category);

-- ============================================
-- ADMIN_SETTINGS TABLE - System settings
-- ============================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin PIN
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES ('admin_pin', '1234')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY - Allow public read access
-- ============================================

-- Hosts
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read hosts" ON hosts;
DROP POLICY IF EXISTS "Allow service write hosts" ON hosts;
CREATE POLICY "Allow public read hosts" ON hosts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service write hosts" ON hosts FOR ALL TO service_role USING (true);

-- Campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow service write campaigns" ON campaigns;
CREATE POLICY "Allow public read campaigns" ON campaigns FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service write campaigns" ON campaigns FOR ALL TO service_role USING (true);

-- Call History
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read call_history" ON call_history;
DROP POLICY IF EXISTS "Allow service write call_history" ON call_history;
CREATE POLICY "Allow public read call_history" ON call_history FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service write call_history" ON call_history FOR ALL TO service_role USING (true);

-- Call Queue
ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read call_queue" ON call_queue;
DROP POLICY IF EXISTS "Allow service write call_queue" ON call_queue;
CREATE POLICY "Allow public read call_queue" ON call_queue FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service write call_queue" ON call_queue FOR ALL TO service_role USING (true);

-- Responses
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read responses" ON responses;
DROP POLICY IF EXISTS "Allow service write responses" ON responses;
CREATE POLICY "Allow public read responses" ON responses FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service write responses" ON responses FOR ALL TO service_role USING (true);

-- Recordings
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read recordings" ON recordings;
DROP POLICY IF EXISTS "Allow service write recordings" ON recordings;
CREATE POLICY "Allow public read recordings" ON recordings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow service write recordings" ON recordings FOR ALL TO service_role USING (true);

-- Admin Settings (service role only)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service access admin_settings" ON admin_settings;
CREATE POLICY "Allow service access admin_settings" ON admin_settings FOR ALL TO service_role USING (true);

-- ============================================
-- ENABLE REALTIME for live updates
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE hosts;
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE call_history;
ALTER PUBLICATION supabase_realtime ADD TABLE call_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS hosts_updated_at ON hosts;
CREATE TRIGGER hosts_updated_at BEFORE UPDATE ON hosts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS recordings_updated_at ON recordings;
CREATE TRIGGER recordings_updated_at BEFORE UPDATE ON recordings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SAMPLE DATA (optional - uncomment to insert)
-- ============================================
/*
INSERT INTO hosts (phone_number, name, total_beds, city, state, is_registered) VALUES
  ('+18453762437', 'Yakov Yosef Gross', 3, 'Spring Valley', 'NY', true),
  ('+18451234567', 'Test Host', 2, 'Monsey', 'NY', true);

INSERT INTO campaigns (shabbat_date, beds_needed, beds_confirmed, status) VALUES
  (CURRENT_DATE + INTERVAL '7 days', 50, 0, 'active');
*/

SELECT 'Database setup complete!' AS status;
