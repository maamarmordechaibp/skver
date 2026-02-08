import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // GET - Fetch all system recordings
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('system_recordings')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Error fetching system recordings:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // POST - Upload recording for a key
  if (req.method === 'POST') {
    try {
      const formData = await req.formData();
      const key = formData.get('key') as string | null;
      const file = formData.get('file') as File | null;

      if (!key) {
        return new Response(JSON.stringify({ error: 'Recording key is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!file) {
        return new Response(JSON.stringify({ error: 'File is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(buffer);
      const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')) : '.mp3';
      const fileName = `system/${key}_${Date.now()}${ext}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, fileBytes, {
          contentType: file.type || 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;

      // Update system_recordings table
      const { data: updateData, error: updateError } = await supabase
        .from('system_recordings')
        .update({
          file_url: fileUrl,
          use_tts: false,
          updated_at: new Date().toISOString()
        })
        .eq('key', key)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      return new Response(JSON.stringify({
        success: true,
        file_url: fileUrl,
        recording: updateData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Error uploading recording:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // PUT - Clear recording (revert to TTS)
  if (req.method === 'PUT') {
    try {
      const body = await req.json();
      const { key, clear } = body;

      if (!key) {
        return new Response(JSON.stringify({ error: 'Recording key is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (clear) {
        // Get current file_url to delete from storage
        const { data: current } = await supabase
          .from('system_recordings')
          .select('file_url')
          .eq('key', key)
          .single();

        // Delete from storage if exists
        if (current?.file_url) {
          const fileName = current.file_url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('recordings')
              .remove([`system/${fileName}`]);
          }
        }

        // Update to use TTS
        const { data, error } = await supabase
          .from('system_recordings')
          .update({
            file_url: null,
            use_tts: true,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, recording: data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid operation' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Error updating recording:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
