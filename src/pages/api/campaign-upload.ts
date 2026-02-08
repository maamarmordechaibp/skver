import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const formData = await req.formData();

    const campaignId = formData.get('campaignId') as string | null;

    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'Campaign ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const buffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(buffer);
    const fileName = `campaign-${campaignId}-${Date.now()}.mp3`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, fileBytes, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file to storage: ' + uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Update campaign with the recording URL
    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ custom_message_url: publicUrl })
      .eq('id', campaignId)
      .select()
      .single();

    if (updateError) {
      console.error('Campaign update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update campaign: ' + updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      campaign
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
