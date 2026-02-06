// lib/queue-builder.ts
import { createClient } from "@supabase/supabase-js";
import { calculatePriorityScore, randomizeWithinTiers } from "./priority";

export async function buildCallQueue(campaignId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get campaign details
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  // Determine if special Shabbat
  const isSpecial = await isSpecialShabbat(campaign.shabbat_date);

  // Get eligible hosts
  const { data: hosts } = await supabase
    .from("hosts")
    .select("*")
    .eq("is_registered", true)
    .in("call_frequency", isSpecial ? ["weekly", "special"] : ["weekly"]);

  if (!hosts || hosts.length === 0) {
    throw new Error("No eligible hosts");
  }

  // Calculate priority for each host
  const hostsWithPriority = await Promise.all(
    hosts.map(async (host) => {
      // Get last acceptance
      const { data: lastResponse } = await supabase
        .from("responses")
        .select("responded_at")
        .eq("host_id", host.id)
        .eq("response_type", "accepted")
        .order("responded_at", { ascending: false })
        .limit(1)
        .single();

      const lastAcceptedWeek = lastResponse
        ? getWeekNumber(new Date(lastResponse.responded_at))
        : null;

      const priorityScore = calculatePriorityScore({
        hostId: host.id,
        lastAcceptedWeek,
        totalAcceptances: 0,
        totalDeclines: 0,
      });

      return { hostId: host.id, priorityScore };
    })
  );

  // Randomize within tiers
  const randomized = randomizeWithinTiers(hostsWithPriority);

  // Insert into call_queue
  const queueItems = randomized.map((item, index) => ({
    campaign_id: campaignId,
    host_id: item.hostId,
    priority_score: index, // Use index as final priority
    status: "pending",
  }));

  const { error } = await supabase.from("call_queue").insert(queueItems);

  if (error) throw error;

  return queueItems.length;
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

async function isSpecialShabbat(date: string): Promise<boolean> {
  // Implement your logic here
  // For now, all Shabatot are treated equally
  return false;
}
