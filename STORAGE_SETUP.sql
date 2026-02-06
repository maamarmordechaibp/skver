-- Storage Setup for Voice Recordings
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kzxveopoyooaxvejjtve/sql

-- Create storage bucket for recordings (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to recordings
CREATE POLICY "Allow public access to recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'recordings');

-- Allow authenticated uploads
CREATE POLICY "Allow uploads to recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recordings');

-- Allow service role full access
CREATE POLICY "Allow service role full access to recordings"
ON storage.objects FOR ALL
USING (bucket_id = 'recordings');

SELECT 'Storage bucket created!' AS status;
