// src/app/api/voice/registration/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/registration-beds" finishOnKey="#" timeout="15">
    <Say voice="man" language="he-IL">
      ברוכים הבאים לתהליך הרישום למחניסי אורחים.
      אנא הזינו את מספר המיטות הזמינות לאורחים ואחר כך לחצו סולמית.
    </Say>
  </Gather>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
