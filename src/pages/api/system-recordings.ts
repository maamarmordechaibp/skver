import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // GET - Fetch all system recordings
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('system_recordings')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err: any) {
      console.error('Error fetching system recordings:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - Upload recording for a key
  if (req.method === 'POST') {
    try {
      const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });

      const [fields, files] = await form.parse(req);
      const key = Array.isArray(fields.key) ? fields.key[0] : fields.key;
      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      if (!key) {
        return res.status(400).json({ error: 'Recording key is required' });
      }

      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      // Read file
      const fileBuffer = fs.readFileSync(file.filepath);
      const fileName = `system/${key}_${Date.now()}${path.extname(file.originalFilename || '.mp3')}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, fileBuffer, {
          contentType: file.mimetype || 'audio/mpeg',
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

      // Clean up temp file
      fs.unlinkSync(file.filepath);

      return res.status(200).json({ 
        success: true, 
        file_url: fileUrl,
        recording: updateData 
      });
    } catch (err: any) {
      console.error('Error uploading recording:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT - Clear recording (revert to TTS)
  if (req.method === 'PUT') {
    try {
      // Parse body manually since bodyParser is disabled
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      
      const { key, clear } = body;

      if (!key) {
        return res.status(400).json({ error: 'Recording key is required' });
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
        return res.status(200).json({ success: true, recording: data });
      }

      return res.status(400).json({ error: 'Invalid operation' });
    } catch (err: any) {
      console.error('Error updating recording:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
