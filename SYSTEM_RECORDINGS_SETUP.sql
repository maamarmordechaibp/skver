-- System Recordings Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

-- Drop existing recordings table if needed (comment out if you have data)
-- DROP TABLE IF EXISTS system_recordings CASCADE;

-- Create system_recordings table for all IVR messages
CREATE TABLE IF NOT EXISTS system_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,  -- Unique identifier for the recording
  name VARCHAR(255) NOT NULL,         -- Display name
  description TEXT,                   -- Help text for admin
  category VARCHAR(50) NOT NULL,      -- Category for grouping
  file_url TEXT,                      -- URL to uploaded MP3
  use_tts BOOLEAN DEFAULT false,      -- If true, use TTS instead of recording
  tts_text TEXT,                      -- TTS fallback text if no recording
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_private field to hosts table
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Insert all system recording slots
INSERT INTO system_recordings (key, name, description, category, tts_text, use_tts, sort_order) VALUES
-- MAIN MENU (always plays - upload includes welcome, or TTS says full message)
('main_menu', 'Main Menu Welcome', 'Full welcome message and menu options - recording should include welcome greeting and all menu options', 'main_menu', 
 'Welcome to the Guest House Management Phone Line. To report availability, press 1. To register as a host, press 2. To contact the office, press 3. For admin options, press 8. To leave a message, press 0.', 
 true, 1),

-- SYSTEM IDENTIFICATION  
('system_identified_you', 'System Identified You As', 'Plays before saying the persons name: "The system identified you as..."', 'identification',
 'The system identified you as', true, 10),

-- BEDS INFO
('we_have_in_system', 'We Have In The System', 'Plays before saying bed count: "We have in the system that you have..."', 'beds_info',
 'We have in the system that you have', true, 20),

-- CONFIRMATION PROMPTS
('confirm_or_change', 'Confirm Or Change Beds', 'Options after bed count: "...beds. To confirm all beds press 1, to change press 2"', 'confirmation',
 'beds. To confirm all beds are available for this week, press 1. To change the amount, press 2.', true, 30),

('enter_amount_beds', 'Enter Amount of Beds', 'Prompt to enter new bed count: "Please enter the amount of beds then press pound"', 'confirmation',
 'Please enter the amount of beds, then press pound.', true, 31),

-- THANK YOU MESSAGES
('thank_you_friday', 'Thank You - Contact Friday', 'Confirmation message: "Thank you. We will get back to you on Friday. Have a good Shabbat."', 'thank_you',
 'Thank you. We will get back to you on Friday. Have a good Shabbat.', true, 40),

('all_beds_booked', 'All Beds Booked', 'When campaign is full: "All beds are completed for this week..."', 'thank_you',
 'All beds are completed for this week. We dont need any beds at this time. Thank you for your willingness to help. Have a good Shabbat.', true, 41),

-- REGISTRATION FLOW
('registration_beds_prompt', 'Registration - How Many Beds', 'Ask new host how many beds: "How many beds do you have available?"', 'registration',
 'How many beds do you have available? Enter the number and press pound.', true, 50),

('private_or_not', 'Private Place Question', 'Ask if private home: "Is this a private place? Press 1 for yes, press 2 for no"', 'registration',
 'Is this a private place? Press 1 for yes, press 2 for no.', true, 51),

('registration_thank_you', 'Registration Complete', 'Thank you after registration', 'registration',
 'Thank you for registering. We will contact you when we need beds. Have a good Shabbat.', true, 52),

-- OUTBOUND CALLS (Campaign)
('weekly_greeting', 'Weekly Campaign Greeting', 'Custom weekly message before asking about beds (uploaded per campaign or recorded by admin)', 'weekly',
 'Hello, this is the Guest House Management system calling to check availability for this Shabbat.', true, 60)

ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  tts_text = EXCLUDED.tts_text,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_recordings_key ON system_recordings(key);
CREATE INDEX IF NOT EXISTS idx_system_recordings_category ON system_recordings(category);

-- Verify
SELECT key, name, category, CASE WHEN file_url IS NOT NULL THEN '✓ Has Recording' ELSE '○ TTS Only' END as status
FROM system_recordings 
ORDER BY sort_order;
