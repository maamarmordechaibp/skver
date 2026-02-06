// Type definitions for the Machnisei Orchim IVR System

export interface Host {
  id: string;
  phone_number: string;
  name: string | null;
  total_beds: number;
  location_type: 'private' | 'home';
  call_frequency: 'weekly' | 'special';
  is_registered: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  shabbat_date: string;
  beds_needed: number;
  beds_confirmed: number;
  custom_message_url: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  created_by: string | null;
  completed_at: string | null;
}

export interface CallQueue {
  id: string;
  campaign_id: string;
  host_id: string;
  priority_score: number;
  status: 'pending' | 'calling' | 'accepted' | 'declined' | 'no_answer' | 'skipped';
  called_at: string | null;
  created_at: string;
}

export interface Response {
  id: string;
  campaign_id: string;
  host_id: string;
  beds_offered: number;
  response_type: 'accepted' | 'declined' | 'cancelled';
  response_method: 'outbound_call' | 'inbound_call';
  responded_at: string;
}

export interface CallHistory {
  id: string;
  campaign_id: string | null;
  host_id: string | null;
  call_sid: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  duration: number | null;
  status: string;
  recording_url: string | null;
  created_at: string;
}

export interface AdminSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

export interface HostHistory {
  hostId: string;
  lastAcceptedWeek: number | null;
  totalAcceptances: number;
  totalDeclines: number;
}

export interface IVRSession {
  callSid: string;
  from: string;
  to: string;
  hostId?: string;
  hostName?: string;
  totalBeds?: number;
  campaignId?: string;
  step?: string;
  data?: Record<string, any>;
}

export interface LaMLResponse {
  xml: string;
}
