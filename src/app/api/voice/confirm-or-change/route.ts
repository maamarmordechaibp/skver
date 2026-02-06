// src/app/api/voice/confirm-or-change/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get("Digits") as string;
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from") as string;

  if (digits === "1") {
    // Confirm
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    יישר כוח על הטבת ידך. מערכת מחניסי אורחים תקשר אליך בקרוב לתאם פרטים.
    שבת שלום!
  </Say>
</Response>`;
    return new NextResponse(response, {
      headers: { "Content-Type": "text/xml" },
    });
  } else if (digits === "2") {
    // Change
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/update-beds?from=${from}" finishOnKey="#" timeout="15">
    <Say voice="man" language="he-IL">
      אנא הזינו את המספר החדש של המיטות הזמינות ולחצו סולמית.
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
