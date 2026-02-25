/**
 * voice-launch-calls - Process the call queue and make outbound calls via SignalWire REST API
 * Called from the web UI when admin clicks "Start Calls"
 * Calls one host at a time; status callbacks auto-continue to next host
 * 
 * campaign_id and host_id are passed in the StatusCallback URL query params
 * so the callback always knows the exact campaign/host context.
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
// campaign_id and host_id are embedded in the StatusCallback URL
async function makeCall(toNumber: string, webhookUrl: string, campaignId: string, hostId: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
  const spaceUrl = SIGNALWIRE_SPACE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${spaceUrl}/api/laml/2010-04-01/Accounts/${SIGNALWIRE_PROJECT_ID}/Calls`;
  
  const auth = btoa(`${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`);
  
  const statusCallbackUrl = `${SUPABASE_URL}/functions/v1/voice-launch-calls?campaign_id=${encodeURIComponent(campaignId)}&host_id=${encodeURIComponent(hostId)}`;
  
  const params = new URLSearchParams({
    From: SIGNALWIRE_PHONE_NUMBER,
    To: toNumber,
    Url: webhookUrl,
    StatusCallback: statusCallbackUrl,
    StatusCallbackEvent: 'completed',
    StatusCallbackMethod: 'POST',
    Timeout: '30',
  });
  
  try {
    console.log(`Calling ${toNumber} via SignalWire (campaign=${campaignId}, host=${hostId})...`);
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
      const reqUrl = new URL(req.url);
      const campaignId = reqUrl.searchParams.get('campaign_id') || '';
      const hostId = reqUrl.searchParams.get('host_id') || '';
      
      const formData = await req.formData();
      const callSid = (formData.get('CallSid') as string) || '';
      const callStatus = (formData.get('CallStatus') as string) || '';
      const to = (formData.get('To') as string) || '';
      
      console.log(`Status callback: ${callSid} -> ${callStatus} (${to}) campaign=${campaignId} host=${hostId}`);
      
      if (callSid && callStatus && campaignId && hostId) {
        let queueStatus = 'completed';
        if (callStatus === 'no-answer' || callStatus === 'busy') queueStatus = 'no_answer';
        else if (callStatus === 'failed' || callStatus === 'canceled') queueStatus = 'failed';
        
        // Update call_logs
        await fetch(
          `${SUPABASE_URL}/rest/v1/call_logs?call_sid=eq.${encodeURIComponent(callSid)}`,
          {
            method: 'PATCH',
            headers: DB_HEADERS,
            body: JSON.stringify({ status: callStatus }),
          }
        );
        
        // Update queue entry — no status filter so it works even if voice-outbound-response
        // already updated it. We only make it "worse" (no_answer/failed) if not already completed.
        if (queueStatus !== 'completed') {
          // For no_answer/failed: only update if still "calling" (don't overwrite voice-outbound-response's "completed")
          await fetch(
            `${SUPABASE_URL}/rest/v1/call_queue?campaign_id=eq.${campaignId}&host_id=eq.${hostId}&status=eq.calling`,
            {
              method: 'PATCH',
              headers: DB_HEADERS,
              body: JSON.stringify({ status: queueStatus, completed_at: new Date().toISOString() }),
            }
          );
        } else {
          // For completed: update regardless of current status to ensure it's marked done
          await fetch(
            `${SUPABASE_URL}/rest/v1/call_queue?campaign_id=eq.${campaignId}&host_id=eq.${hostId}&status=in.(calling,pending)`,
            {
              method: 'PATCH',
              headers: DB_HEADERS,
              body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
            }
          );
        }
        
        // --- Auto-continue: always try to launch the next call ---
        // Don't check for "calling" entries — just go straight to the next pending host.
        // This avoids the bug where a stale "calling" entry blocks progress.
        const campCheckRes = await fetch(
          `${SUPABASE_URL}/rest/v1/campaigns?id=eq.${campaignId}&select=id,beds_needed,beds_confirmed,status,custom_message_url`,
          { headers: DB_HEADERS }
        );
        const campCheck = await campCheckRes.json();
        const camp = campCheck?.[0];
        
        if (camp && camp.status === 'active' && camp.beds_confirmed < camp.beds_needed) {
          // Still need beds — pick next host using rotation-based priority
          // Recompute scores fresh for remaining pending hosts
          const allPendingRes = await fetch(
            `${SUPABASE_URL}/rest/v1/call_queue?campaign_id=eq.${campaignId}&status=eq.pending&select=id,host_id`,
            { headers: DB_HEADERS }
          );
          const allPending = await allPendingRes.json();
          
          if (allPending?.length > 0) {
            // Fetch latest accepted responses for scoring
            const respRes2 = await fetch(
              `${SUPABASE_URL}/rest/v1/responses?response_type=eq.accepted&select=host_id,responded_at&order=responded_at.desc`,
              { headers: DB_HEADERS }
            );
            const allResp2 = await respRes2.json();
            const lastAcc2: Record<string, string> = {};
            for (const r of allResp2 || []) {
              if (r.host_id && !lastAcc2[r.host_id]) {
                lastAcc2[r.host_id] = r.responded_at;
              }
            }

            const now2 = Date.now();
            const ONE_DAY2 = 24 * 60 * 60 * 1000;
            let bestItem: any = null;
            let bestScore = -1;
            for (const item of allPending) {
              const lastDate = lastAcc2[item.host_id];
              let score: number;
              if (!lastDate) {
                score = 10000 + Math.floor(Math.random() * 100);
              } else {
                const daysSince = Math.floor((now2 - new Date(lastDate).getTime()) / ONE_DAY2);
                score = daysSince * 100 + Math.floor(Math.random() * 50);
              }
              // Update DB score for frontend visibility
              fetch(`${SUPABASE_URL}/rest/v1/call_queue?id=eq.${item.id}`, {
                method: 'PATCH',
                headers: DB_HEADERS,
                body: JSON.stringify({ priority_score: score }),
              }).catch(e => console.error('Score update error:', e));
              if (score > bestScore) {
                bestScore = score;
                bestItem = item;
              }
            }

            const nextItem = bestItem;
            const nextHostRes = await fetch(
              `${SUPABASE_URL}/rest/v1/hosts?id=eq.${nextItem.host_id}&select=id,name,phone_number,total_beds`,
              { headers: DB_HEADERS }
            );
            const nextHostData = await nextHostRes.json();
            const nextHost = nextHostData?.[0];
            
            if (nextHost?.phone_number) {
              const functionsUrl = `${SUPABASE_URL}/functions/v1`;
              const webhookParams = new URLSearchParams({
                campaign_id: campaignId,
                host_id: nextHost.id,
                host_name: nextHost.name || 'Guest',
                total_beds: String(nextHost.total_beds || 0),
                message_url: camp.custom_message_url || '',
              });
              const webhookUrl = `${functionsUrl}/voice-outbound-call?${webhookParams.toString()}`;
              
              console.log(`Auto-continue: calling ${nextHost.name} (${nextHost.phone_number}) for campaign ${campaignId}`);
              const callResult = await makeCall(nextHost.phone_number, webhookUrl, campaignId, nextHost.id);
              
              if (callResult.success) {
                await fetch(`${SUPABASE_URL}/rest/v1/call_queue?id=eq.${nextItem.id}`, {
                  method: 'PATCH',
                  headers: DB_HEADERS,
                  body: JSON.stringify({ status: 'calling' }),
                });
                
                fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
                  method: 'POST',
                  headers: { ...DB_HEADERS, 'Prefer': 'return=minimal' },
                  body: JSON.stringify({
                    call_sid: callResult.callSid,
                    direction: 'outbound',
                    from_number: SIGNALWIRE_PHONE_NUMBER,
                    to_number: nextHost.phone_number,
                    status: 'initiated',
                    host_id: nextHost.id,
                  }),
                }).catch(e => console.error('Call log error:', e));
                
                console.log(`Auto-continue success: SID=${callResult.callSid}`);
              } else {
                await fetch(`${SUPABASE_URL}/rest/v1/call_queue?id=eq.${nextItem.id}`, {
                  method: 'PATCH',
                  headers: DB_HEADERS,
                  body: JSON.stringify({ status: 'failed' }),
                });
                console.error(`Auto-continue call failed: ${callResult.error}`);
              }
            }
          } else {
            // No more pending hosts - mark campaign complete
            console.log(`Campaign ${campaignId}: no more pending hosts, marking complete`);
            await fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${campaignId}`, {
              method: 'PATCH',
              headers: DB_HEADERS,
              body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
            });
          }
        } else if (camp && camp.beds_confirmed >= camp.beds_needed) {
          // Target reached - complete campaign and cancel remaining
          console.log(`Campaign ${campaignId}: target reached (${camp.beds_confirmed}/${camp.beds_needed}), completing`);
          await fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${campaignId}&status=eq.active`, {
            method: 'PATCH',
            headers: DB_HEADERS,
            body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
          });
          await fetch(`${SUPABASE_URL}/rest/v1/call_queue?campaign_id=eq.${campaignId}&status=eq.pending`, {
            method: 'PATCH',
            headers: DB_HEADERS,
            body: JSON.stringify({ status: 'cancelled' }),
          });
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

    // Reset beds_confirmed to 0 and clear old responses so we start fresh
    // This prevents stale counts from previous runs on the same campaign
    await fetch(`${SUPABASE_URL}/rest/v1/campaigns?id=eq.${campaignId}`, {
      method: 'PATCH',
      headers: DB_HEADERS,
      body: JSON.stringify({ beds_confirmed: 0 }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/responses?campaign_id=eq.${campaignId}`, {
      method: 'DELETE',
      headers: DB_HEADERS,
    });
    console.log('Reset beds_confirmed=0 and cleared old responses');
    
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
    
    // Get ALL pending queue items for this campaign (we'll recompute priority ourselves)
    const queueRes = await fetch(
      `${SUPABASE_URL}/rest/v1/call_queue?campaign_id=eq.${campaignId}&status=eq.pending&select=id,host_id,priority_score`,
      { headers: DB_HEADERS }
    );
    const queueItems = await queueRes.json();
    console.log(`Queue query status: ${queueRes.status}, items found: ${Array.isArray(queueItems) ? queueItems.length : 'NOT_ARRAY: ' + JSON.stringify(queueItems)}`);
    
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

    // --- Recompute priority scores based on rotation fairness ---
    // Fetch all accepted responses to determine last acceptance per host
    const respRes = await fetch(
      `${SUPABASE_URL}/rest/v1/responses?response_type=eq.accepted&select=host_id,responded_at&order=responded_at.desc`,
      { headers: DB_HEADERS }
    );
    const allResponses = await respRes.json();
    const lastAccepted: Record<string, string> = {};
    for (const r of allResponses || []) {
      if (r.host_id && !lastAccepted[r.host_id]) {
        lastAccepted[r.host_id] = r.responded_at;
      }
    }

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    for (const q of queueItems) {
      const lastDate = lastAccepted[q.host_id];
      let score: number;
      if (!lastDate) {
        // Never accepted - highest priority (called first)
        score = 10000 + Math.floor(Math.random() * 100);
      } else {
        // Days since last acceptance = priority
        // Accepted today = score near 0 (called last)
        // Accepted 14+ days ago = score 1400+ (called sooner)
        const daysSince = Math.floor((now - new Date(lastDate).getTime()) / ONE_DAY_MS);
        score = daysSince * 100 + Math.floor(Math.random() * 50);
      }
      q.priority_score = score;
      // Update the DB so the frontend also sees correct scores
      fetch(`${SUPABASE_URL}/rest/v1/call_queue?id=eq.${q.id}`, {
        method: 'PATCH',
        headers: DB_HEADERS,
        body: JSON.stringify({ priority_score: score }),
      }).catch(e => console.error('Score update error:', e));
    }
    // Sort: highest score first
    queueItems.sort((a: any, b: any) => b.priority_score - a.priority_score);
    console.log('Recomputed priority order:', queueItems.map((q: any) => `host=${q.host_id} score=${q.priority_score} lastAccepted=${lastAccepted[q.host_id] || 'never'}`).join(', '));
    
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
    
    // Process only ONE host at a time - auto-continue (status callback) handles calling the next
    // This ensures we only call more people when the previous call has a definitive result
    const qItem = queueItems[0];
    {
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
      } else {
      
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
      const callResult = await makeCall(host.phone_number, webhookUrl, campaignId, host.id);
      
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
      }
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
