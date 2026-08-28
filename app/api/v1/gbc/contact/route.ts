import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { contactFormSchema } from "@/app/(projects)/(GBC)/utils/validations";
import { submitContactForm } from "@/gbc/services/contactService";

export async function POST(req: NextRequest) {
  try {
    const data = await validateBody(req, contactFormSchema);
    const inquiry = await submitContactForm(data);
    return NextResponse.json({ success: true, data: inquiry, message: "Thank you! We'll get back to you soon." });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
