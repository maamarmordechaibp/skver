import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

// Helper to parse form data
const parseForm = (req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 20 * 1024 * 1024 }); // 20MB
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { fields, files } = await parseForm(req);
    
    const campaignId = Array.isArray(fields.campaignId) ? fields.campaignId[0] : fields.campaignId;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }
    
    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const fileName = `campaign-${campaignId}-${Date.now()}.mp3`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    // Clean up temp file
    try {
      fs.unlinkSync(uploadedFile.filepath);
    } catch (e) {
      console.error('Error cleaning up temp file:', e);
    }

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage: ' + uploadError.message });
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
      return res.status(500).json({ error: 'Failed to update campaign: ' + updateError.message });
    }

    return res.status(200).json({ 
      success: true, 
      url: publicUrl,
      campaign 
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
