// src/app/api/voice/option-1-new/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    המערכת מזהה את המספר שלכם אבל אתם עדיין לא רשומים.
    אנא הזינו את מספר המיטות הזמינות לשבת הזו ואחר כך לחצו סולמית.
  </Say>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/save-new-beds" finishOnKey="#" timeout="15">
  </Gather>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
