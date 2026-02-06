# 🗄️ Supabase Database Setup Guide

Your Supabase project is now connected! Follow these 3 steps to create the database schema.

## ✅ Step 1: Access Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve
2. Click **"SQL Editor"** in the left sidebar
3. Click **"+ New Query"** button

## ✅ Step 2: Enable UUID Extension

Copy and paste this SQL, then click **"Run"**:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## ✅ Step 3: Create All Tables

Copy and paste the entire SQL below and run it:

```sql
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

CREATE INDEX idx_hosts_phone ON hosts(phone_number);
CREATE INDEX idx_hosts_registered ON hosts(is_registered);

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

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_date ON campaigns(shabbat_date);

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

CREATE INDEX idx_queue_campaign_status ON call_queue(campaign_id, status);
CREATE INDEX idx_queue_priority ON call_queue(priority_score);

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

CREATE INDEX idx_responses_campaign ON responses(campaign_id);
CREATE INDEX idx_responses_host ON responses(host_id);

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

CREATE INDEX idx_call_history_host ON call_history(host_id);
CREATE INDEX idx_call_history_campaign ON call_history(campaign_id);

-- Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('admin_pin', '1234'),
  ('admin_email', 'admin@machniseiorchim.org'),
  ('system_phone_number', '+1234567890')
ON CONFLICT DO NOTHING;

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

DROP TRIGGER IF EXISTS trigger_update_beds ON responses;
CREATE TRIGGER trigger_update_beds
AFTER INSERT ON responses
FOR EACH ROW
EXECUTE FUNCTION update_campaign_beds();

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

-- Enable Row Level Security
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for now - secure later)
CREATE POLICY "Allow all operations on hosts" ON hosts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on campaigns" ON campaigns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on call_queue" ON call_queue
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on responses" ON responses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on call_history" ON call_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on admin_settings" ON admin_settings
  FOR ALL USING (true) WITH CHECK (true);
```

## ✅ Step 4: Verify Setup

After running the SQL, you should see:
- ✅ 6 tables created (hosts, campaigns, call_queue, responses, call_history, admin_settings)
- ✅ Multiple indexes created for performance
- ✅ 2 functions created (update_campaign_beds, get_next_host_to_call)
- ✅ 1 trigger created (trigger_update_beds)
- ✅ Row Level Security enabled on all tables

## ✅ Step 5: Test Sample Data (Optional)

To populate with test data, run:

```sql
-- Insert test host
INSERT INTO hosts (phone_number, name, total_beds, location_type, call_frequency, is_registered)
VALUES ('+1234567890', 'John Smith', 3, 'private', 'weekly', true);

-- Insert test campaign
INSERT INTO campaigns (shabbat_date, beds_needed, status)
VALUES ('2026-02-06', 10, 'active');
```

## ✅ Step 6: Start Your App

Your app is ready to use! The dashboard will now:
- ✅ Show live data from your database
- ✅ Create campaigns
- ✅ Track host availability
- ✅ Generate reports

Run in your terminal:
```bash
npm run dev
```

Then visit: **http://localhost:3000**

---

**🎉 All set! Your database is connected and ready to go!**
