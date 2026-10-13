import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SurfboardPlanStatus } from "@/prisma/generated";
import { findPlanIdByNumber } from "@/surfboard/services/planService";

type WebhookPayload = {
  planNumber: string;
  status: "SUBMITTED" | "PROCESSING" | "COMPLETED" | "FAILED" | "LODGED";
  certificateUrl?: string;
  error?: string;
};

export async function POST(request: Request) {
  try {
    // Verify the webhook secret (if provided by Red Copy)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.REDCOPY_WEBHOOK_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.error("Webhook unauthorized - invalid token");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload: WebhookPayload = await request.json();

    // Validate required fields
    if (!payload.planNumber || !payload.status) {
      console.error("Missing required fields in webhook payload:", payload);
      return new NextResponse("Missing required fields", { status: 400 });
    }

    console.log(
      `Processing Red Copy webhook for plan ${payload.planNumber} with status ${payload.status}`
    );

    // Find the plan by planNumber
    const planId = await findPlanIdByNumber(payload.planNumber);
    const plan = planId
      ? await prisma.surfboardPlan.findUnique({
          where: { id: planId },
          select: {
            id: true,
            status: true,
            redCopyStatus: true,
          },
        })
      : null;

    if (!plan) {
      console.error(`Plan not found: ${payload.planNumber}`);
      return new NextResponse("Plan not found", { status: 404 });
    }

    // Map webhook status to Prisma enum value
    const mapToPlanStatus = (status: string): SurfboardPlanStatus => {
      switch (status) {
        case "LODGED":
          return "LODGED"; // or whatever your enum value is for completed status
        case "FAILED":
          return "QUERIED"; // or appropriate status for failed
        default:
          return plan.status; // Keep current status for other cases
      }
    };

    // Prepare update data with proper typing
    const updateData: any = {
      redCopyStatus: payload.status,
      redCopyUpdatedAt: new Date(),
    };

    // Only update the main status if we're in a terminal state
    if (payload.status === "LODGED" || payload.status === "FAILED") {
      updateData.status = mapToPlanStatus(payload.status);

      if (payload.status === "LODGED" && payload.certificateUrl) {
        updateData.certificateFilePath = payload.certificateUrl;
      }
    }

    // If there's an error, store it
    if (payload.error) {
      console.error(
        `Error in Red Copy processing for plan ${payload.planNumber}:`,
        payload.error
      );
      updateData.redCopyError = payload.error;
      updateData.redCopyStatus = "FAILED";
      updateData.status = "QUERIED"; // or appropriate status for failed
    }

    // Update the plan
    await prisma.surfboardPlan.update({
      where: { id: plan.id },
      data: updateData,
    });

    console.log(
      `Successfully updated Red Copy status for plan ${payload.planNumber} to ${payload.status}`
    );

    // Revalidate the relevant paths
    revalidatePath(`/surfboard/dashboard/plan/${plan.id}`);
    revalidatePath("/surfboard/dashboard/plans");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Red Copy webhook:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
