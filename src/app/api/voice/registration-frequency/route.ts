// src/app/api/voice/registration-frequency/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get("Digits") as string;
  const searchParams = request.nextUrl.searchParams;
  const beds = searchParams.get("beds") as string;
  const location = searchParams.get("location") as string;
  const from = searchParams.get("from") as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const frequency = digits === "1" ? "weekly" : "special";

  // Save or update host
  const { error } = await supabase.from("hosts").upsert({
    phone_number: from,
    total_beds: parseInt(beds),
    location_type: location,
    call_frequency: frequency,
    is_registered: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Registration error:", error);
  }

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    יישר כוח על ההרשמה!
    שימו לב, כשאתם מקבלים את השיחה ועונים שאתם מוכנים,
    נשלח אורחים רק לאחר שניצור איתכם קשר אישי ונאשר אורח לפי הנוחות שלכם.
    שבת שלום!
  </Say>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
