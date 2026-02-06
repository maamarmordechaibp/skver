// src/app/api/voice/voicemail-complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendVoicemail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const recordingUrl = (formData.get("RecordingUrl") as string) || "";
  const from = (formData.get("From") as string) || "";

  // Save voicemail to database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("call_history").insert({
    from_number: from,
    to_number: process.env.SIGNALWIRE_PHONE_NUMBER!,
    direction: "inbound",
    status: "voicemail",
    recording_url: recordingUrl,
  });

  // Send email notification
  await sendVoicemail(null, from, recordingUrl, "New voicemail message");

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">תודה על ההודעה. נחזור אליך בקרוב. שבת שלום.</Say>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
