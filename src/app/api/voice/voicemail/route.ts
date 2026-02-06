// src/app/api/voice/voicemail/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    בבקשה השאירו הודעה ברורה עם השם ומספר הטלפון שלכם,
    ואנחנו ניצור איתכם קשר בעזרת השם.
  </Say>
  <Record
    action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/voicemail-complete"
    maxLength="120"
    playBeep="true"
  />
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
