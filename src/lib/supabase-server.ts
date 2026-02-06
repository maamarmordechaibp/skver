import { createClient } from '@supabase/supabase-js';
import type { Host, Campaign, CallQueue, Response, CallHistory } from './types';

// Server-side client
export function createServerClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Get host by phone number
export async function getHostByPhone(phoneNumber: string): Promise<Host | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('hosts')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  return data ? (data as Host) : null;
}

// Get or create host
export async function getOrCreateHost(phoneNumber: string): Promise<Host> {
  let host = await getHostByPhone(phoneNumber);
  
  if (!host) {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('hosts')
      .insert({
        phone_number: phoneNumber,
        total_beds: 0,
        is_registered: false,
        call_frequency: 'weekly',
      })
      .select()
      .single();
    
    if (error) throw error;
    host = data as Host;
  }
  
  return host;
}

// Get active campaign
export async function getActiveCampaign(): Promise<Campaign | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return data ? (data as Campaign) : null;
}

// Get campaign by date
export async function getCampaignByDate(date: string): Promise<Campaign | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('shabbat_date', date)
    .maybeSingle();
  
  return data ? (data as Campaign) : null;
}

// Create campaign
export async function createCampaign(
  shabbatDate: string,
  bedsNeeded: number,
  messageUrl?: string
): Promise<Campaign> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      shabbat_date: shabbatDate,
      beds_needed: bedsNeeded,
      custom_message_url: messageUrl,
      status: 'active',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Campaign;
}

// Save host response
export async function saveResponse(
  campaignId: string,
  hostId: string,
  bedsOffered: number,
  responseType: 'accepted' | 'declined' | 'cancelled',
  responseMethod: 'outbound_call' | 'inbound_call'
): Promise<Response> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('responses')
    .insert({
      campaign_id: campaignId,
      host_id: hostId,
      beds_offered: bedsOffered,
      response_type: responseType,
      response_method: responseMethod,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Response;
}

// Update host registration
export async function updateHostRegistration(
  hostId: string,
  name: string,
  totalBeds: number,
  locationType: 'private' | 'home',
  callFrequency: 'weekly' | 'special'
): Promise<Host> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('hosts')
    .update({
      name,
      total_beds: totalBeds,
      location_type: locationType,
      call_frequency: callFrequency,
      is_registered: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', hostId)
    .select()
    .single();
  
  if (error) throw error;
  return data as Host;
}

// Log call
export async function logCall(
  callSid: string,
  direction: 'inbound' | 'outbound',
  fromNumber: string,
  toNumber: string,
  status: string,
  hostId?: string,
  campaignId?: string
): Promise<CallHistory> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('call_history')
    .insert({
      call_sid: callSid,
      direction,
      from_number: fromNumber,
      to_number: toNumber,
      status,
      host_id: hostId || null,
      campaign_id: campaignId || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as CallHistory;
}

// Update call status
export async function updateCallStatus(
  callSid: string,
  status: string,
  duration?: number,
  recordingUrl?: string
): Promise<void> {
  const supabase = createServerClient();
  
  const update: any = { status };
  if (duration) update.duration = duration;
  if (recordingUrl) update.recording_url = recordingUrl;
  
  const { error } = await supabase
    .from('call_history')
    .update(update)
    .eq('call_sid', callSid);
  
  if (error) throw error;
}

// Update queue status
export async function updateQueueStatus(
  campaignId: string,
  hostId: string,
  status: 'pending' | 'calling' | 'accepted' | 'declined' | 'no_answer' | 'skipped',
  calledAt?: string
): Promise<void> {
  const supabase = createServerClient();
  
  const update: any = { status };
  if (calledAt) update.called_at = calledAt;
  
  const { error } = await supabase
    .from('call_queue')
    .update(update)
    .eq('campaign_id', campaignId)
    .eq('host_id', hostId);
  
  if (error) throw error;
}

// Get campaign stats
export async function getCampaignStats(campaignId: string) {
  const supabase = createServerClient();
  
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();
  
  const { data: responses } = await supabase
    .from('responses')
    .select('*')
    .eq('campaign_id', campaignId);
  
  const { data: queue } = await supabase
    .from('call_queue')
    .select('*')
    .eq('campaign_id', campaignId);
  
  return {
    campaign,
    responses: responses || [],
    queue: queue || [],
  };
}

// Get all registered hosts
export async function getRegisteredHosts(): Promise<Host[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('hosts')
    .select('*')
    .eq('is_registered', true)
    .order('created_at', { ascending: false });
  
  return data ? (data as Host[]) : [];
}

// Get all campaigns
export async function getAllCampaigns(): Promise<Campaign[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('shabbat_date', { ascending: false });
  
  return data ? (data as Campaign[]) : [];
}

// Update campaign status
export async function updateCampaignStatus(
  campaignId: string,
  status: 'pending' | 'active' | 'completed' | 'cancelled'
): Promise<void> {
  const supabase = createServerClient();
  
  const update: any = { status };
  if (status === 'completed') {
    update.completed_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('campaigns')
    .update(update)
    .eq('id', campaignId);
  
  if (error) throw error;
}
