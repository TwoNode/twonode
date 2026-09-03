import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validate";
import { createPairTicket } from "@/gbc/services/ticketService";

const attendeeSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  profession: z.string(),
  otherProfession: z.string().optional(),
  isPrimary: z.boolean().optional(),
});
const bodySchema = z.object({ attendees: z.array(attendeeSchema) });

/** Public — REGULAR tickets, 2 attendees. Per-attendee business validation happens in the service. */
export async function POST(req: NextRequest) {
  try {
    const { attendees } = await validateBody(req, bodySchema);
    const result = await createPairTicket(attendees);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err, { route: req.nextUrl.pathname, method: req.method });
  }
}
