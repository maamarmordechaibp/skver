// lib/calling-engine.ts
import { createClient } from "@supabase/supabase-js";

export async function startCampaignCalls(campaignId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Continuously call hosts until quota is met
  while (true) {
    // Check if quota met
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("beds_needed, beds_confirmed")
      .eq("id", campaignId)
      .single();

    if (!campaign) break;

    if (campaign.beds_confirmed >= campaign.beds_needed) {
      // Quota met - mark campaign complete
      await supabase
        .from("campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      await sendCompletionEmail(campaignId);
      break;
    }

    // Get next host to call
    const { data: nextHost } = await supabase
      .rpc("get_next_host_to_call", { p_campaign_id: campaignId })
      .single();

    if (!nextHost) {
      // No more hosts in queue
      await supabase
        .from("campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
      break;
    }

    // Mark as calling
    const typedHost = nextHost as any;
    await supabase
      .from("call_queue")
      .update({
        status: "calling",
        called_at: new Date().toISOString(),
      })
      .eq("id", typedHost.queue_id);

    // Make the outbound call
    await makeOutboundCall(campaignId, typedHost);

    // Wait before next call (to avoid overwhelming)
    await sleep(5000); // 5 seconds between calls
  }
}

async function makeOutboundCall(
  campaignId: string,
  host: {
    host_id: string;
    host_phone: string;
    host_name: string;
    queue_id: string;
  }
) {
  // Note: SignalWire client integration would go here
  // For now we'll just log the attempt
  console.log(
    `Making outbound call to ${host.host_name} at ${host.host_phone}`
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // In production, use SignalWire client:
    // const client = new SignalWireClient({ ... });
    // const call = await client.voice.dialPhone({ ... });

    // For now, save mock data
    await supabase.from("call_history").insert({
      campaign_id: campaignId,
      host_id: host.host_id,
      call_sid: `mock-${Date.now()}`,
      direction: "outbound",
      from_number: process.env.SIGNALWIRE_PHONE_NUMBER!,
      to_number: host.host_phone,
      status: "initiated",
    });
  } catch (error) {
    console.error("Failed to make call:", error);

    // Mark as no_answer in queue
    await supabase
      .from("call_queue")
      .update({ status: "no_answer" })
      .eq("id", host.queue_id);
  }
}

async function sendCompletionEmail(campaignId: string) {
  // Email sending logic
  console.log(`Sending completion email for campaign ${campaignId}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
