/**
 * voice-launch-calls - Process the call queue and make outbound calls via SignalWire REST API
 * Called from the web UI when admin clicks "Start Calls"
 * Processes up to 5 hosts at a time, then returns status
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SIGNALWIRE_PROJECT_ID = Deno.env.get('SIGNALWIRE_PROJECT_ID') || '';
const SIGNALWIRE_API_TOKEN = Deno.env.get('SIGNALWIRE_API_TOKEN') || '';
const SIGNALWIRE_SPACE_URL = Deno.env.get('SIGNALWIRE_SPACE_URL') || '';
const SIGNALWIRE_PHONE_NUMBER = Deno.env.get('SIGNALWIRE_PHONE_NUMBER') || '';

const DB_HEADERS: Record<string, string> = {
  'apikey': SUPABASE_SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// Make a single outbound call via SignalWire REST API
async function makeCall(toNumber: string, webhookUrl: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
  const spaceUrl = SIGNALWIRE_SPACE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${spaceUrl}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls`;
  
  const auth = btoa(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`);
  
  const params = new URLSearchParams({
    From: SIGNALWIRE_PHONE_NUMBER,
    To: toNumber,
    Url: webhookUrl,
    StatusCallback: `${SUPABASE_URL}/functions/v1/voice-launch-calls`,
    StatusCallbackEvent: 'completed',
    StatusCallbackMethod: 'POST',
    Timeout: '30',
  });
  
  try {
    console.log(`Calling ${toNumber} via SignalWire...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`SignalWire API error ${res.status}: ${errorText}`);
      return { success: false, error: `SignalWire ${res.status}: ${errorText}` };
    }
    
    const data = await res.json();
    console.log(`Call initiated: SID=${data.sid} to ${toNumber}`);
    return { success: true, callSid: data.sid };
  } catch (e) {
    console.error(`Call failed to ${toNumber}:`, e);
    return { success: false, error: String(e) };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    // --- Handle SignalWire status callback (form-urlencoded) ---
    if (contentType.includes('form-urlencoded')) {
      const formData = await req.formData();
      const callSid = (formData.get('CallSid') as string) || '';
      const callStatus = (formData.get('CallStatus') as string) || '';
      const to = (formData.get('To') as string) || '';
      
      console.log(`Status callback: ${callSid} -> ${callStatus} (${to})`);
      
      // Update queue item status based on call result
      if (callSid && callStatus) {
        let queueStatus = 'completed';
        if (callStatus === 'no-answer' || callStatus === 'busy') queueStatus = 'no_answer';
        else if (callStatus === 'failed' || callStatus === 'canceled') queueStatus = 'failed';
        else if (callStatus === 'completed') queueStatus = 'completed';
        
        // Update call_logs
        await fetch(
          `${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${encodeURIComponent(callSid)}`,
          {
            method: 'PATCH',
            headers: DB_HEADERS,
            body: JSON.stringify({ status: callStatus }),
          }
        );
        
        // Find the queue item via call_logs host_id, then update queue status
        const logRes = await fetch(
          `${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${encodeURIComponent(callSid)}&select=host_id`,
          { headers: DB_HEADERS }
        );
        const logs = await logRes.json();
        const hostId = logs?.[0]?.host_id;
        if (hostId) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/call_queue?host_id=eq.${hostId}&status=eq.calling`,
            {
              method: 'PATCH',
              headers: DB_HEADERS,
              body: JSON.stringify({ status: queueStatus }),
            }
          );
        }
      }
      
      return new Response('OK', { status: 200 });
    }
    
    // --- Handle JSON request from web UI ---
    const body = await req.json();
    const { campaignId, batchSize = 5 } = body;
    
    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'campaignId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    console.log(`Launching calls for campaign ${campaignId}, batch size ${batchSize}`);
    console.log(`SignalWire config: project=${SIGNALWIRE_PROJECT_ID ? 'SET' : 'MISSING'}, token=${SIGNALWIRE_API_TOKEN ? 'SET' : 'MISSING'}, space=${SIGNALWIRE_SPACE_URL || 'MISSING'}, phone=${SIGNALWIRE_PHONE_NUMBER || 'MISSING'}`);
    
    // Get campaign info (for custom message URL)
    const campRes = await fetch(
      `${SUPABASE_URL}/rest/v1/campaigns?id=eq.${campaignId}&select=id,custom_message_url,beds_needed,beds_confirmed,status`,
      { headers: DB_HEADERS }
    );
    const campaigns = await campRes.json();
    const campaign = campaigns?.[0];
    
    if (!campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Check if campaign already hit target
    if (campaign.beds_confirmed >= campaign.beds_needed && campaign.beds_needed > 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Campaign target already reached',
        called: 0 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    // Get pending queue items ordered by priority (highest beds first)
    // Use priority_score column - hosts with most beds get highest score
    const queueRes = await fetch(
      `${SUPABASE_URL}/rest/v1/call_queue?campaign_id=eq.${campaignId}&status=eq.pending&order=priority_score.desc.nullslast,created_at.asc&limit=${batchSize}&select=id,host_id,priority_score`,
      { headers: DB_HEADERS }
    );
    const queueItems = await queueRes.json();
    console.log(`Queue query status: ${queueRes.status}, items found: ${Array.isArray(queueItems) ? queueItems.length : 'NOT_ARRAY: ' + JSON.stringify(queueItems)}`);
    if (Array.isArray(queueItems)) {
      console.log('Queue order:', queueItems.map((q: any) => `host=${q.host_id} score=${q.priority_score}`).join(', '));
    }
    
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending hosts in queue',
        called: 0 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    // Get host details for these queue items
    const hostIds = queueItems.map((q: any) => q.host_id);
    const hostsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/hosts?id=in.(${hostIds.join(',')})&select=id,name,phone_number,total_beds`,
      { headers: DB_HEADERS }
    );
    const hosts = await hostsRes.json();
    const hostsMap: Record<string, any> = {};
    for (const h of hosts || []) {
      hostsMap[h.id] = h;
    }
    console.log(`Hosts found: ${(hosts || []).length}, map:`, JSON.stringify(hosts?.map((h: any) => ({ id: h.id, name: h.name, phone: h.phone_number }))));
    
    const functionsUrl = `${SUPABASE_URL}/functions/v1`;
    const results: any[] = [];
    const bedsRemaining = campaign.beds_needed - campaign.beds_confirmed;
    let bedsPotentiallyLocked = 0;
    
    // Process each host in the batch - stop when we've called enough to cover remaining beds
    for (const qItem of queueItems) {
      // If we've already locked enough potential beds, skip the rest (leave as pending for later)
      if (bedsRemaining > 0 && bedsPotentiallyLocked >= bedsRemaining) {
        console.log(`Stopping calls: ${bedsPotentiallyLocked} beds locked >= ${bedsRemaining} beds remaining`);
        break;
      }

      const host = hostsMap[qItem.host_id];
      if (!host || !host.phone_number) {
        // Mark as failed if no phone
        await fetch(
          `${SUPABASE_URL}/rest/v1/call_queue?id=eq.${qItem.id}`,
          {
            method: 'PATCH',
            headers: DB_HEADERS,
            body: JSON.stringify({ status: 'failed' }),
          }
        );
        results.push({ host_id: qItem.host_id, status: 'failed', reason: 'no phone number' });
        continue;
      }
      
      // Build the webhook URL for when the call connects
      const webhookParams = new URLSearchParams({
        campaign_id: campaignId,
        host_id: host.id,
        host_name: host.name || 'Guest',
        total_beds: String(host.total_beds || 0),
        message_url: campaign.custom_message_url || '',
      });
      const webhookUrl = `${functionsUrl}/voice-outbound-call?${webhookParams.toString()}`;
      
      // Make the actual call
      const callResult = await makeCall(host.phone_number, webhookUrl);
      
      if (callResult.success) {
        // Update queue: mark as calling, store call SID in notes
        await fetch(
          `${SUPABASE_URL}/rest/v1/call_queue?id=eq.${qItem.id}`,
          {
            method: 'PATCH',
            headers: DB_HEADERS,
            body: JSON.stringify({ 
              status: 'calling', 
            }),
          }
        );
        
        // Log the call
        fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
          method: 'POST',
          headers: { ...DB_HEADERS, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            call_sid: callResult.callSid,
            direction: 'outbound',
            from_number: SIGNALWIRE_PHONE_NUMBER,
            to_number: host.phone_number,
            status: 'initiated',
            host_id: host.id,
          }),
        }).catch(e => console.error('Call log error:', e));
        
        results.push({ host_id: host.id, name: host.name, status: 'calling', callSid: callResult.callSid });
        bedsPotentiallyLocked += host.total_beds || 0;
      } else {
        // Mark as failed
        await fetch(
          `${SUPABASE_URL}/rest/v1/call_queue?id=eq.${qItem.id}`,
          {
            method: 'PATCH',
            headers: DB_HEADERS,
            body: JSON.stringify({ status: 'failed' }),
          }
        );
        results.push({ host_id: host.id, name: host.name, status: 'failed', error: callResult.error });
      }
      
      // Small delay between calls to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
    
    const successCount = results.filter(r => r.status === 'calling').length;
    
    return new Response(JSON.stringify({ 
      success: true,
      called: successCount,
      total: results.length,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
    
  } catch (error) {
    console.error('voice-launch-calls error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
