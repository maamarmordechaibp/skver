-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hosts Table
CREATE TABLE IF NOT EXISTS hosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  total_beds INTEGER NOT NULL,
  location_type VARCHAR(20) CHECK (location_type IN ('private', 'home')),
  call_frequency VARCHAR(20) CHECK (call_frequency IN ('weekly', 'special')),
  is_registered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on phone_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_hosts_phone ON hosts(phone_number);
CREATE INDEX IF NOT EXISTS idx_hosts_registered ON hosts(is_registered);

-- Weekly Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shabbat_date DATE NOT NULL,
  beds_needed INTEGER NOT NULL,
  beds_confirmed INTEGER DEFAULT 0,
  custom_message_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_date ON campaigns(shabbat_date);

-- Call Queue Table
CREATE TABLE IF NOT EXISTS call_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  priority_score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'accepted', 'declined', 'no_answer', 'skipped')),
  called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, host_id)
);

CREATE INDEX IF NOT EXISTS idx_queue_campaign_status ON call_queue(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON call_queue(priority_score);

-- Responses Table
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  beds_offered INTEGER NOT NULL,
  response_type VARCHAR(20) CHECK (response_type IN ('accepted', 'declined', 'cancelled')),
  response_method VARCHAR(20) CHECK (response_method IN ('outbound_call', 'inbound_call')),
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_campaign ON responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_responses_host ON responses(host_id);

-- Call History Table
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  host_id UUID REFERENCES hosts(id) ON DELETE SET NULL,
  call_sid VARCHAR(100),
  direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  duration INTEGER,
  status VARCHAR(20),
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_host ON call_history(host_id);
CREATE INDEX IF NOT EXISTS idx_call_history_campaign ON call_history(campaign_id);

-- Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings (if not already present)
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('admin_pin', '1234'),
  ('admin_email', 'admin@machniseiorchim.org'),
  ('system_phone_number', '+1234567890')
ON CONFLICT (setting_key) DO NOTHING;

-- Database Functions

-- Update campaign beds_confirmed
CREATE OR REPLACE FUNCTION update_campaign_beds()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.response_type = 'accepted' THEN
    UPDATE campaigns 
    SET beds_confirmed = beds_confirmed + NEW.beds_offered
    WHERE id = NEW.campaign_id;
  ELSIF NEW.response_type = 'cancelled' THEN
    UPDATE campaigns 
    SET beds_confirmed = GREATEST(0, beds_confirmed - NEW.beds_offered)
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_beds'
  ) THEN
    CREATE TRIGGER trigger_update_beds
    AFTER INSERT ON responses
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_beds();
  END IF;
END $$;

-- Function to get next host to call
CREATE OR REPLACE FUNCTION get_next_host_to_call(p_campaign_id UUID)
RETURNS TABLE (
  queue_id UUID,
  host_id UUID,
  host_name VARCHAR,
  host_phone VARCHAR,
  host_beds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cq.id,
    h.id,
    h.name,
    h.phone_number,
    h.total_beds
  FROM call_queue cq
  JOIN hosts h ON h.id = cq.host_id
  WHERE cq.campaign_id = p_campaign_id
    AND cq.status = 'pending'
  ORDER BY cq.priority_score ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
