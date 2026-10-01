import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { Platform } from "@/utils/platform";

export interface AuditEntry {
  /** The user who performed the action — never the account it was performed on (that goes in `entityId`). */
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
}

export async function getClientInfo(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || null;
    const userAgent = headersList.get("user-agent") || null;
    return { ipAddress, userAgent };
  } catch {
    // Called outside a request (scripts, tests) — there is simply no client to record.
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Writes one entry to the audit table of `platform`, capturing the caller's IP
 * and user agent. Never throws: like Surfboard's original logger, a failed
 * audit write must not undo or break the operation it describes.
 */
export async function writeAudit(platform: Platform, entry: AuditEntry): Promise<void> {
  try {
    const { ipAddress, userAgent } = await getClientInfo();
    const data = {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      ipAddress,
      userAgent,
    };

    switch (platform) {
      case Platform.GBC:
        await prisma.gBCAuditLog.create({ data });
        break;
      case Platform.SURFBOARD:
        await prisma.surfboardAuditLog.create({ data });
        break;
      case Platform.REVA:
        await prisma.revaAuditLog.create({ data });
        break;
      default:
        throw new Error(`No audit log for platform: ${platform}`);
    }
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
