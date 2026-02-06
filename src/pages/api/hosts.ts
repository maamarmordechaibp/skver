import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method === 'GET') {
      // Fetch hosts
      const { data: hosts, error } = await supabase
        .from('hosts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch last accepted response for each host
      const { data: responses } = await supabase
        .from('responses')
        .select('host_id, responded_at, response_type, beds_offered')
        .eq('response_type', 'accepted')
        .order('responded_at', { ascending: false });

      // Create a map of host_id to their last accepted response
      const lastAcceptedMap: Record<string, { date: string; beds: number }> = {};
      (responses || []).forEach((r: any) => {
        if (!lastAcceptedMap[r.host_id]) {
          lastAcceptedMap[r.host_id] = { date: r.responded_at, beds: r.beds_offered };
        }
      });

      // Merge last_accepted info into hosts
      const hostsWithLastAccepted = (hosts || []).map((h: any) => ({
        ...h,
        last_accepted: lastAcceptedMap[h.id]?.date || null,
        last_accepted_beds: lastAcceptedMap[h.id]?.beds || null,
      }));

      return res.status(200).json(hostsWithLastAccepted);
    }

    if (req.method === 'POST') {
      // Create new host
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      const { data, error } = await supabase
        .from('hosts')
        .insert({
          phone_number: body.phone_number,
          name: body.name || 'Unknown',
          total_beds: body.total_beds || 0,
          location_type: body.location_type || 'home',
          city: body.city || null,
          state: body.state || null,
          zip: body.zip || null,
          address_1: body.address_1 || null,
          is_registered: body.is_registered ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, ...updates } = body;
      
      // Add updated_at timestamp
      updates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('hosts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const { error } = await supabase
        .from('hosts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
