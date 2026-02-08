import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  console.log('Campaigns API - URL:', supabaseUrl, 'Key exists:', !!supabaseServiceKey);

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const action = req.nextUrl.searchParams.get('action');
  const campaignId = req.nextUrl.searchParams.get('campaignId');
  const queueId = req.nextUrl.searchParams.get('queueId');

  try {
    // GET call queue for a campaign
    if (req.method === 'GET' && action === 'queue') {
      console.log('Fetching queue for campaign:', campaignId);

      // First get the queue items
      const { data: queueData, error: queueError } = await supabase
        .from('call_queue')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('status', { ascending: true })
        .order('created_at', { ascending: true });

      if (queueError) {
        console.error('Queue fetch error:', queueError);
        // If table doesn't exist, return empty array
        if (queueError.code === '42P01' || queueError.message?.includes('does not exist')) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw queueError;
      }

      // Then get hosts for those queue items
      const hostIds = (queueData || []).map((q: any) => q.host_id).filter(Boolean);
      let hostsMap: Record<string, any> = {};

      if (hostIds.length > 0) {
        const { data: hostsData } = await supabase
          .from('hosts')
          .select('id, name, phone_number, total_beds, city')
          .in('id', hostIds);

        (hostsData || []).forEach((h: any) => {
          hostsMap[h.id] = h;
        });
      }

      // Format queue items with host info
      const formatted = (queueData || []).map((q: any) => {
        const host = hostsMap[q.host_id];
        return {
          ...q,
          host_name: host?.name,
          host_phone: host?.phone_number,
          host_beds: host?.total_beds,
          host_city: host?.city,
        };
      });
      return new Response(JSON.stringify(formatted), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET responses for a campaign
    if (req.method === 'GET' && action === 'responses') {
      const { data, error } = await supabase
        .from('responses')
        .select('*, host:host_id(name, phone_number, city)')
        .eq('campaign_id', campaignId)
        .order('responded_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((r: any) => ({
        ...r,
        host_name: r.host?.name,
        host_phone: r.host?.phone_number,
        host_city: r.host?.city,
      }));
      return new Response(JSON.stringify(formatted), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET all campaigns
    if (req.method === 'GET') {
      console.log('Fetching all campaigns...');

      // Auto-complete any past campaigns (shabbat_date has passed)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      await supabase
        .from('campaigns')
        .update({ status: 'completed' })
        .in('status', ['active', 'pending'])
        .lt('shabbat_date', todayStr);

      // Auto-create campaign for next Saturday ONLY if today is Saturday or later
      // (i.e., the previous Shabbat is done)
      const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
      // Calculate next Saturday
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
      const nextSat = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
      const nextSatStr = nextSat.toISOString().split('T')[0];

      // Only auto-create if there's no active/pending campaign for ANY upcoming Saturday
      const { data: anyActive } = await supabase
        .from('campaigns')
        .select('id')
        .in('status', ['active', 'pending'])
        .gte('shabbat_date', todayStr)
        .limit(1);

      if (!anyActive || anyActive.length === 0) {
        // No active campaign at all — create one for next Saturday
        console.log(`Auto-creating campaign for next Shabbat: ${nextSatStr}`);
        await supabase.from('campaigns').insert({
          shabbat_date: nextSatStr,
          beds_needed: 0,
          beds_confirmed: 0,
          status: 'pending',
        });
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Campaign fetch error:', error);
        // If table doesn't exist, return empty array
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw error;
      }
      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST - various actions
    if (req.method === 'POST') {
      const body = await req.json();

      // Start calls action - queue all registered hosts and launch calls
      if (body.action === 'start_calls') {
        // Get all registered hosts with beds, sorted by most beds first
        const { data: hosts, error: hostsErr } = await supabase
          .from('hosts')
          .select('id, name, phone_number, total_beds')
          .eq('is_registered', true)
          .gt('total_beds', 0)
          .order('total_beds', { ascending: false });

        console.log('Found hosts for campaign:', hosts?.length || 0, hostsErr ? `Error: ${hostsErr.message}` : '', JSON.stringify(hosts?.map((h: any) => ({ id: h.id, name: h.name, beds: h.total_beds }))));

        // Get each host's most recent accepted response to rotate fairly
        // Hosts who accepted recently get lower priority (go to back of list)
        const { data: recentResponses } = await supabase
          .from('responses')
          .select('host_id, responded_at')
          .eq('response_type', 'accepted')
          .order('responded_at', { ascending: false });

        // Build a map: host_id -> most recent acceptance date
        const lastAccepted: Record<string, string> = {};
        for (const r of recentResponses || []) {
          if (r.host_id && !lastAccepted[r.host_id]) {
            lastAccepted[r.host_id] = r.responded_at;
          }
        }

        // Get campaign to know beds_needed
        const { data: campData } = await supabase
          .from('campaigns')
          .select('beds_needed, beds_confirmed')
          .eq('id', body.campaignId)
          .single();
        const bedsStillNeeded = (campData?.beds_needed || 0) - (campData?.beds_confirmed || 0);

        if (hosts && hosts.length > 0) {
          // Clear ALL existing queue items for this campaign (handles UNIQUE constraint)
          const { error: delErr } = await supabase
            .from('call_queue')
            .delete()
            .eq('campaign_id', body.campaignId);
          console.log('Deleted old queue items:', delErr ? `Error: ${delErr.message}` : 'OK');

          // Calculate priority: beds matter, but recently-accepted hosts go to back
          // Score = total_beds * 100 - recency_penalty
          // Hosts who never accepted: full score (beds * 100)
          // Hosts who accepted recently: beds * 100 - days_since (more recent = bigger penalty)
          const now = Date.now();
          const scoredHosts = hosts.map((h: any) => {
            let score = (h.total_beds || 0) * 100;
            const lastDate = lastAccepted[h.id];
            if (lastDate) {
              const daysSince = Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
              // Recent acceptance = big penalty (up to 1000 for today, decreasing over time)
              // After ~10 days the penalty is gone
              const penalty = Math.max(0, 1000 - (daysSince * 100));
              score -= penalty;
            }
            return { ...h, priority_score: score };
          });

          // Sort by priority_score descending (highest first)
          scoredHosts.sort((a: any, b: any) => b.priority_score - a.priority_score);

          console.log('Host priority order:', scoredHosts.map((h: any) => `${h.name}(beds=${h.total_beds}, score=${h.priority_score}, lastAccepted=${lastAccepted[h.id] || 'never'})`).join(', '));

          // Queue ALL registered hosts in priority order
          // The voice-launch-calls function handles smart stopping
          const queueItems = scoredHosts.map((h: any) => ({
            campaign_id: body.campaignId,
            host_id: h.id,
            status: 'pending',
            priority_score: h.priority_score,
          }));
          const { error: insertErr } = await supabase.from('call_queue').insert(queueItems);
          console.log('Queue insert result:', insertErr ? `Error: ${insertErr.message}` : `Success (${queueItems.length} hosts queued, ${bedsStillNeeded} beds still needed)`);

          // Update campaign status to active
          await supabase.from('campaigns').update({ status: 'active' }).eq('id', body.campaignId);

          // Trigger the edge function to actually make calls
          try {
            const launchRes = await fetch(
              `${supabaseUrl}/functions/v1/voice-launch-calls`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({ campaignId: body.campaignId, batchSize: 5 }),
              }
            );
            const launchData = await launchRes.json();
            console.log('Launch calls result:', launchData);
            return new Response(JSON.stringify({
              success: true,
              queued: hosts.length,
              called: launchData.called || 0,
              results: launchData.results || [],
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (launchErr: any) {
            console.error('Error launching calls:', launchErr);
            // Queue was created successfully even if calls failed to launch
            return new Response(JSON.stringify({
              success: true,
              queued: hosts.length,
              called: 0,
              warning: 'Hosts queued but call launch failed: ' + launchErr.message,
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
        return new Response(JSON.stringify({ success: true, queued: hosts?.length || 0, called: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create new campaign
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          shabbat_date: body.shabbat_date,
          beds_needed: body.beds_needed || 0,
          beds_confirmed: 0,
          status: 'pending',
          custom_message_url: body.custom_message_url || null
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // PUT - update campaign or queue item
    if (req.method === 'PUT') {
      const body = await req.json();

      // Skip a host in the queue
      if (body.action === 'skip_host') {
        const { error } = await supabase
          .from('call_queue')
          .update({ status: 'skipped' })
          .eq('id', body.queueItemId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Unskip a host
      if (body.action === 'unskip_host') {
        const { error } = await supabase
          .from('call_queue')
          .update({ status: 'pending' })
          .eq('id', body.queueItemId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { id, ...updates } = body;

      const { data, error } = await supabase
        .from('campaigns')
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
