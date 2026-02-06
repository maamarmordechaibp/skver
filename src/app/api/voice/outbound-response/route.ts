// src/app/api/voice/outbound-response/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = (formData.get("Digits") as string) || "";
  const searchParams = request.nextUrl.searchParams;
  const campaignId = searchParams.get("campaign_id") || "";
  const hostId = searchParams.get("host_id") || "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", hostId)
    .single();

  if (!host) {
    return new NextResponse("Host not found", { status: 404 });
  }

  let response = "";

  switch (digits) {
    case "1": // Accept
      // Save response
      await supabase.from("responses").insert({
        campaign_id: campaignId,
        host_id: hostId,
        beds_offered: host.total_beds,
        response_type: "accepted",
        response_method: "outbound_call",
      });

      // Update queue
      await supabase
        .from("call_queue")
        .update({ status: "accepted" })
        .eq("campaign_id", campaignId)
        .eq("host_id", hostId);

      response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    יישר כוח! ניצור איתכם קשר אישי כדי לתאם אורח לפי הנוחות שלכם. שבת שלום!
  </Say>
</Response>`;
      break;

    case "2": // Change beds
      response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/outbound-update-beds?campaign_id=${campaignId}&host_id=${hostId}" finishOnKey="#" timeout="15">
    <Say voice="man" language="he-IL">
      אנא הזינו את מספר המיטות הזמינות ולחצו סולמית.
    </Say>
  </Gather>
</Response>`;
      break;

    case "3": // Decline
      await supabase.from("responses").insert({
        campaign_id: campaignId,
        host_id: hostId,
        beds_offered: 0,
        response_type: "declined",
        response_method: "outbound_call",
      });

      await supabase
        .from("call_queue")
        .update({ status: "declined" })
        .eq("campaign_id", campaignId)
        .eq("host_id", hostId);

      response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">תודה על התשובה. שבת שלום!</Say>
</Response>`;
      break;

    default:
      response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">לא קיבלנו מענה תקין. שבת שלום.</Say>
</Response>`;
  }

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
