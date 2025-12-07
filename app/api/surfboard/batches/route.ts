import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedSurfUserFromCookie } from "@/utils/surfAuth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedSurfUserFromCookie();
    if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: any = {};

    if (status) {
      whereClause.paymentStatus = status;
    }

    const batches = await prisma.certificateOfDepositBatch.findMany({
      where: whereClause,
      include: {
        submitter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            plans: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to include planCount
    const mappedBatches = batches.map((batch) => ({
      ...batch,
      planCount: batch._count.plans,
      _count: undefined,
    }));

    return NextResponse.json({ batches: mappedBatches });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
