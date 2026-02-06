// src/app/api/voice/admin-message-recorded/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const recordingUrl = (formData.get("RecordingUrl") as string) || "";
  const searchParams = request.nextUrl.searchParams;
  const beds = searchParams.get("beds") as string;

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">ההודעה שלכם:</Say>
  ${recordingUrl ? `<Play>${recordingUrl}</Play>` : ""}
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/admin-message-action?beds=${beds}&recording=${encodeURIComponent(recordingUrl)}" numDigits="1" timeout="10">
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
}
