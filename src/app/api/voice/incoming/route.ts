// src/app/api/voice/incoming/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = (formData.get("From") as string) || "";
  const callSid = (formData.get("CallSid") as string) || "";

  // Check if caller is registered
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("phone_number", from)
    .single();

  // Log call
  await supabase.from("call_history").insert({
    call_sid: callSid,
    direction: "inbound",
    from_number: from,
    to_number: process.env.SIGNALWIRE_PHONE_NUMBER!,
    status: "in-progress",
    host_id: host?.id || null,
  });

  // Generate LaML response
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/main-menu" numDigits="1" timeout="10">
    <Say voice="man" language="en-US">
      Welcome to the Guest House Management Phone Line.
      To report that you are ready to host guests on Shabbat, press 1.
      To register as a host and receive calls, press 2.
      To connect with the office, press 3.
      For admin options, press 8.
      To leave a message, press 0.
    </Say>
  </Gather>
  <Say voice="man" language="en-US">We did not receive an answer. Have a good Shabbat.</Say>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
