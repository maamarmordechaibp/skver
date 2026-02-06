// src/app/api/voice/admin-message-action/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get("Digits") as string;
  const searchParams = request.nextUrl.searchParams;
  const beds = searchParams.get("beds") as string;
  const recording = searchParams.get("recording") as string;

  if (digits === "1") {
    // Play again
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">ההודעה שלכם:</Say>
  ${recording ? `<Play>${recording}</Play>` : ""}
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/admin-message-action?beds=${beds}&recording=${encodeURIComponent(recording)}" numDigits="1" timeout="10">
    <Say voice="man" language="he-IL">
      לחצו 1 כדי לשמוע שוב.
      לחצו 2 כדי להקליט מחדש.
      לחצו 3 כדי לאשר.
    </Say>
  </Gather>
</Response>`;
    return new NextResponse(response, {
      headers: { "Content-Type": "text/xml" },
    });
  } else if (digits === "2") {
    // Re-record
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">בבקשה הקליטו את ההודעה שוב אחרי הצפצוף. לחצו סולמית כשסיימתם.</Say>
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
  } else if (digits === "3") {
    // Confirm and launch campaign
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/admin-launch-campaign?beds=${beds}&recording=${encodeURIComponent(recording)}" numDigits="1" timeout="10">
    <Say voice="man" language="he-IL">
      ביקשתם ${beds} מיטות.
      לחצו 1 כדי לאשר ולהתחיל שיחות.
      לחצו 2 כדי לשנות את המספר.
    </Say>
  </Gather>
</Response>`;
    return new NextResponse(response, {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">בחירה לא חוקית. שבת שלום.</Say>
</Response>`;

  return new NextResponse(errorResponse, {
    headers: { "Content-Type": "text/xml" },
  });
}
