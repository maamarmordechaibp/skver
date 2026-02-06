// src/app/api/voice/registration-beds/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get("Digits") as string;
  const from = formData.get("From") as string;

  // Store beds count in session/cache (in production, use a proper session store)
  // For now, we'll pass it in the redirect

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/registration-location?beds=${digits}&from=${from}" numDigits="1" timeout="10">
    <Say voice="man" language="he-IL">
      תודה. אם האכסניה שלכם היא מיקום פרטי, לחצו 1.
      אם זה אצלכם בבית, לחצו 2.
    </Say>
  </Gather>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
