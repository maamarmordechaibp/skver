// src/app/api/voice/admin-pin/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/admin-verify-pin" finishOnKey="#" timeout="15">
    <Say voice="man" language="he-IL">
      אפשרויות מנהל.
      אנא הזינו את קוד הגישה ולחצו סולמית.
    </Say>
  </Gather>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
