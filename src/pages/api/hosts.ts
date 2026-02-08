import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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

      return new Response(JSON.stringify(hostsWithLastAccepted), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      // Create new host
      const body = await req.json();

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
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
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
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const id = req.nextUrl.searchParams.get('id');
      const { error } = await supabase
        .from('hosts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
