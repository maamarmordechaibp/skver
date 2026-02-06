// src/app/api/voice/registration-location/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get("Digits") as string;
  const searchParams = request.nextUrl.searchParams;
  const beds = searchParams.get("beds") as string;
  const from = searchParams.get("from") as string;

  const locationType = digits === "1" ? "private" : "home";

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/registration-frequency?beds=${beds}&location=${locationType}&from=${from}" numDigits="1" timeout="10">
    <Say voice="man" language="he-IL">
      כמה פעמים תרצו לקבל שיחות?
      על בסיס שבועי בכל פעם שחסר, לחצו 1.
      רק בשבתות מיוחדות, לחצו 2.
    </Say>
  </Gather>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
