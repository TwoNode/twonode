"use server";

import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/utils/authUser";
import prisma from "@/lib/prisma";

export const getAllRequestsWithUser = async () => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            kindeId: true,
          },
        },
      },
    });

    return { success: true, data: properties };
  } catch (error) {
    console.error("Error fetching properties:", error);
    return { success: false, error: "Failed to fetch properties" };
  }
};
