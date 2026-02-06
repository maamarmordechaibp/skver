// src/app/api/voice/outbound-call/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const campaignId = searchParams.get("campaign_id") || "";
  const hostId = searchParams.get("host_id") || "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get campaign and host info
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", hostId)
    .single();

  if (!campaign || !host) {
    return new NextResponse("Not found", { status: 404 });
  }

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${campaign.custom_message_url ? `<Play>${campaign.custom_message_url}</Play>` : ""}
  <Pause length="1"/>

  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/outbound-response?campaign_id=${campaignId}&host_id=${hostId}" numDigits="1" timeout="10">
    <Say voice="man" language="he-IL">
      המערכת מזהה שאתם ${host.name || "חבר"}.
      יש לכם ${host.total_beds} מיטות זמינות.
      כדי לאשר שאתם יכולים לארח אורחים בשבת הזו, לחצו 1.
      כדי לשנות את מספר המיטות, לחצו 2.
      כדי לסרב, לחצו 3.
    </Say>
  </Gather>

  <Say voice="man" language="he-IL">
    לא קיבלנו מענה. ננסה שוב מאוחר יותר. שבת שלום.
  </Say>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
