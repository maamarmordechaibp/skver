// src/app/api/voice/main-menu/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = (formData.get("Digits") as string) || "";
  const from = (formData.get("From") as string) || "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let redirectUrl = "";

  switch (digits) {
    case "1":
      // Check if registered
      const { data: host } = await supabase
        .from("hosts")
        .select("*")
        .eq("phone_number", from)
        .single();

      redirectUrl = host?.is_registered
        ? "/api/voice/option-1-registered"
        : "/api/voice/option-1-new";
      break;

    case "2":
      redirectUrl = "/api/voice/registration";
      break;

    case "3":
      // Forward to office
      const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Connecting you to the office. Please hold.</Say>
  <Dial>+1234567890</Dial>
</Response>`;
      return new NextResponse(response, {
        headers: { "Content-Type": "text/xml" },
      });

    case "8":
      redirectUrl = "/api/voice/admin-pin";
      break;

    case "0":
      redirectUrl = "/api/voice/voicemail";
      break;

    default:
      const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man" language="en-US">Invalid option. Have a good Shabbat.</Say>
</Response>`;
      return new NextResponse(errorResponse, {
        headers: { "Content-Type": "text/xml" },
      });
  }

  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${process.env.NEXT_PUBLIC_APP_URL}${redirectUrl}?From=${from}</Redirect>
</Response>`;

  return new NextResponse(response, {
    headers: { "Content-Type": "text/xml" },
  });
}
