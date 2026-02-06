// src/app/api/voice/option-1-registered/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("From") as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("phone_number", from)
    .single();

  if (!host) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">מצטערים, לא ניתן להזהות את המספר שלך. שבת שלום.</Say>
</Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/confirm-or-change?from=${from}" numDigits="1" timeout="10">
    <Say voice="man" language="he-IL">
      המערכת מזהה שאתם ${host.name || "חבר"}.
      יש לכם ${host.total_beds} מיטות זמינות.
      כדי לאשר, לחצו 1.
      כדי לשנות, לחצו 2.
    </Say>
  </Gather>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
