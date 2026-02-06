// src/app/api/voice/admin-verify-pin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const pin = formData.get("Digits") as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get admin PIN from settings
  const { data: adminPinData } = await supabase
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "admin_pin")
    .single();

  const correctPin = adminPinData?.setting_value || "1234";

  if (pin === correctPin) {
    // PIN correct - proceed to campaign setup
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${process.env.NEXT_PUBLIC_APP_URL}/api/voice/admin-beds" finishOnKey="#" timeout="15">
    <Say voice="man" language="he-IL">
      קוד גישה נכון. כמה מיטות אנחנו צריכים לשבת הזו?
      הזינו את המספר ולחצו סולמית.
    </Say>
  </Gather>
</Response>`;

    return new NextResponse(response, {
      headers: { "Content-Type": "text/xml" },
    });
  } else {
    // PIN incorrect
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="he-IL">קוד גישה לא נכון. שבת שלום.</Say>
</Response>`;

    return new NextResponse(response, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
