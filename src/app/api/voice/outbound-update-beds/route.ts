// src/app/api/voice/outbound-update-beds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const beds = (formData.get("Digits") as string) || "";
  const searchParams = request.nextUrl.searchParams;
  const campaignId = searchParams.get("campaign_id") as string;
  const hostId = searchParams.get("host_id") as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update host beds and save response
  await supabase
    .from("hosts")
    .update({ total_beds: parseInt(beds) })
    .eq("id", hostId);

  // Save response with new bed count
  await supabase.from("responses").insert({
    campaign_id: campaignId,
    host_id: hostId,
    beds_offered: parseInt(beds),
    response_type: "accepted",
    response_method: "outbound_call",
  });

  // Update queue
  await supabase
    .from("call_queue")
    .update({ status: "accepted" })
    .eq("campaign_id", campaignId)
    .eq("host_id", hostId);

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    יישר כוח! ניצור איתכם קשר אישי כדי לתאם אורח לפי הנוחות שלכם. שבת שלום!
  </Say>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
