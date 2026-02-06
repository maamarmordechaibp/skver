// src/app/api/voice/admin-beds/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const beds = formData.get("Digits") as string;

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">בבקשה הקליטו את ההודעה השבועית המותאמת אישית אחרי הצפצוף. לחצו סולמית כשסיימתם.</Say>
  <Record
    action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/admin-message-recorded?beds=${beds}"
    finishOnKey="#"
    maxLength="60"
    playBeep="true"
  />
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
