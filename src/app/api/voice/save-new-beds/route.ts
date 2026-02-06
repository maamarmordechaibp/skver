// src/app/api/voice/save-new-beds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const beds = (formData.get("Digits") as string) || "";
  const from = (formData.get("From") as string) || "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update host with beds
  await supabase
    .from("hosts")
    .update({ total_beds: parseInt(beds) })
    .eq("phone_number", from);

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    תודה. מערכת מחניסי אורחים תקשר אליך בקרוב לתאם פרטים.
    שבת שלום!
  </Say>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
