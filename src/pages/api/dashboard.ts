import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const [campaignsRes, hostsRes, callHistoryRes, responsesRes, queueRes] = await Promise.all([
      supabase.from('campaigns').select('*').eq('status', 'active').limit(1),
      supabase.from('hosts').select('*').gt('total_beds', 0).order('total_beds', { ascending: false }).limit(20),
      supabase.from('call_history').select('*, host:host_id(name, total_beds)').order('created_at', { ascending: false }).limit(30),
      supabase.from('responses').select('*, host:host_id(name)').order('responded_at', { ascending: false }).limit(20),
      supabase.from('call_queue').select('status'),
    ]);

    if (campaignsRes.error) throw campaignsRes.error;

    const campaign = campaignsRes.data?.[0] || null;
    const hosts = hostsRes.data || [];
    const calls = callHistoryRes.data || [];
    const responses = responsesRes.data || [];
    const queue = queueRes.data || [];

    const stats = {
      totalBeds: hosts.reduce((sum: number, h: any) => sum + (h.total_beds || 0), 0),
      totalHosts: hosts.length,
      totalCalls: calls.length,
      accepted: queue.filter((q: any) => q.status === 'accepted').length,
      declined: queue.filter((q: any) => q.status === 'declined').length,
      pending: queue.filter((q: any) => q.status === 'pending').length,
    };

    return new Response(JSON.stringify({ campaign, hosts, calls, responses, stats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to load dashboard data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}