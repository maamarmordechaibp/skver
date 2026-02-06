/**
 * Supabase Database Helpers for Edge Functions
 * Handles all database operations for voice calls
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface Host {
  id: string;
  phone_number: string;
  name: string;
  total_beds: number;
  location_type: string;
  call_frequency: string;
  is_registered: boolean;
  // Address fields from external API
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  shabbat_date: string;
  beds_needed: number;
  beds_confirmed: number;
  custom_message_url?: string;
  status: string;
  created_at: string;
}

export interface CallHistory {
  id: string;
  campaign_id?: string;
  host_id?: string;
  call_sid: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  duration?: number;
  status: string;
  recording_url?: string;
  created_at: string;
}

export class SupabaseDB {
  private client: any;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.client = createClient(supabaseUrl, serviceRoleKey);
  }

  /**
   * Get or create a host by phone number
   */
  async getOrCreateHost(phoneNumber: string): Promise<Host> {
    // Try to get existing host
    const { data: existing, error: getError } = await this.client
      .from('hosts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (existing) {
      return existing;
    }

    // Create new host
    const { data: newHost, error: createError } = await this.client
      .from('hosts')
      .insert({
        phone_number: phoneNumber,
        name: 'Unknown Guest',
        total_beds: 0,
        location_type: 'home',
        call_frequency: 'weekly',
        is_registered: false,
      })
      .select()
      .single();

    if (createError || !newHost) {
      throw new Error(`Failed to create host: ${createError?.message}`);
    }

    return newHost as Host;
  }

  /**
   * Get a host by phone number
   */
  async getHost(phoneNumber: string): Promise<Host | null> {
    const { data, error } = await this.client
      .from('hosts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Host;
  }

  /**
   * Update host information
   */
  async updateHost(
    phoneNumber: string,
    updates: Partial<Host>
  ): Promise<Host> {
    const { data, error } = await this.client
      .from('hosts')
      .update(updates)
      .eq('phone_number', phoneNumber)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update host: ${error?.message}`);
    }

    return data as Host;
  }

  /**
   * Log a call to call_history
   */
  async logCall(callHistory: Partial<CallHistory>): Promise<CallHistory> {
    const { data, error } = await this.client
      .from('call_history')
      .insert({
        ...callHistory,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to log call: ${error?.message}`);
    }

    return data as CallHistory;
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<Campaign[]> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get campaigns:', error);
      return [];
    }

    return (data || []) as Campaign[];
  }

  /**
   * Get the latest active campaign
   */
  async getLatestActiveCampaign(): Promise<Campaign | null> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Campaign;
  }

  /**
   * Check admin PIN
   */
  async checkAdminPin(pin: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_pin')
      .single();

    if (error || !data) {
      // Default PIN if not set
      return pin === '1234';
    }

    return pin === data.setting_value;
  }

  /**
   * Save a host response
   */
  async saveResponse(
    campaignId: string,
    hostId: string,
    bedsOffered: number,
    responseType: 'accepted' | 'declined' | 'changed',
    responseMethod: string
  ) {
    const { data, error } = await this.client
      .from('responses')
      .insert({
        campaign_id: campaignId,
        host_id: hostId,
        beds_offered: bedsOffered,
        response_type: responseType,
        response_method: responseMethod,
        responded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save response: ${error?.message}`);
    }

    return data;
  }

  /**
   * Update call_queue status
   */
  async updateQueueStatus(
    campaignId: string,
    hostId: string,
    status: string,
    respondedAt?: string
  ) {
    const { data, error } = await this.client
      .from('call_queue')
      .update({
        status,
        responded_at: respondedAt || new Date().toISOString(),
      })
      .eq('campaign_id', campaignId)
      .eq('host_id', hostId);

    if (error) {
      throw new Error(`Failed to update queue: ${error?.message}`);
    }

    return data;
  }
}
