// src/app/api/voice/admin-launch-campaign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get("Digits") as string;
  const searchParams = request.nextUrl.searchParams;
  const beds = searchParams.get("beds") as string;
  const recording = searchParams.get("recording") as string;

  if (digits === "1") {
    // Launch campaign
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get next Shabbat date (you can customize this)
    const nextShabbat = getNextShabbatDate();

    // Create campaign
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        shabbat_date: nextShabbat,
        beds_needed: parseInt(beds),
        beds_confirmed: 0,
        custom_message_url: recording,
        status: "active",
        created_by: "admin",
      })
      .select()
      .single();

    if (error) {
      console.error("Campaign creation error:", error);
    }

    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">
    תודה! המערכת תתחיל כעת להתקשר למארחים.
    תקבל דוח במייל.
    שבת שלום!
  </Say>
</Response>`;

    return new NextResponse(response, {
      headers: { "Content-Type": "text/xml" },
    });
  } else if (digits === "2") {
    // Change beds
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/admin-beds" finishOnKey="#" timeout="15">
    <Say voice="man" language="he-IL">
      כמה מיטות אנחנו צריכים? הזינו את המספר ולחצו סולמית.
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

function getNextShabbatDate(): string {
  const today = new Date();
  let shabbat = new Date(today);

  // Find next Saturday
  const day = shabbat.getDay();
  const daysUntilShabbat = (6 - day + 7) % 7;
  const actualDays = daysUntilShabbat === 0 ? 7 : daysUntilShabbat;

  shabbat.setDate(shabbat.getDate() + actualDays);

  return shabbat.toISOString().split("T")[0];
}
