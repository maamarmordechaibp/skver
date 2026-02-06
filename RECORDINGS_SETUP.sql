-- Recordings Table for Voice Messages
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  mp3_url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_recordings_category ON recordings(category);
CREATE INDEX IF NOT EXISTS idx_recordings_active ON recordings(is_active);

-- Insert default system recordings (customize URLs with your storage bucket)
INSERT INTO recordings (name, description, category, mp3_url, duration_seconds) VALUES
  ('Welcome Message', 'Main greeting when caller connects', 'greeting', 'https://your-storage-bucket.com/recordings/welcome.mp3', 8),
  ('New Host Prompt', 'Prompt for new unregistered hosts', 'new_host', 'https://your-storage-bucket.com/recordings/new-host-prompt.mp3', 12),
  ('Confirm Beds', 'Ask to confirm number of beds', 'confirmation', 'https://your-storage-bucket.com/recordings/confirm-beds.mp3', 6),
  ('Thank You', 'Thank you message after call', 'thank_you', 'https://your-storage-bucket.com/recordings/thank-you.mp3', 4),
  ('Menu Main', 'Main menu options', 'menu', 'https://your-storage-bucket.com/recordings/menu-main.mp3', 10),
  ('Invalid Input', 'Invalid input message', 'error', 'https://your-storage-bucket.com/recordings/invalid-input.mp3', 3),
  ('Please Try Again', 'Please try again message', 'error', 'https://your-storage-bucket.com/recordings/please-try-again.mp3', 3),
  ('Admin Pin Prompt', 'Admin PIN entry prompt', 'admin', 'https://your-storage-bucket.com/recordings/admin-pin.mp3', 5),
  ('Registration Menu', 'Registration flow menu', 'registration', 'https://your-storage-bucket.com/recordings/registration-menu.mp3', 8),
  ('Location Question', 'Ask about location type', 'registration', 'https://your-storage-bucket.com/recordings/location-question.mp3', 7)
ON CONFLICT DO NOTHING;

-- Function to get recording URL by category
CREATE OR REPLACE FUNCTION get_recording_url(p_category VARCHAR)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT mp3_url
    FROM recordings
    WHERE category = p_category
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Allow RLS if needed (comment out if you prefer open access)
-- ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read recordings" ON recordings FOR SELECT TO anon AS PERMISSIVE;
