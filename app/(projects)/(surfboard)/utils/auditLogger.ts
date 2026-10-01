// Audit logging utility - no "use server" needed since this is called from server actions

import prisma from "@/lib/prisma";
import { getClientInfo } from "@/lib/audit";

/**
 * Audit logging utility for tracking all critical actions in the Surfboard application
 */

interface AuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  changes?: Record<string, any> | null;
}

/**
 * Log an audit action
 * @param params - Audit log parameters
 * @returns Promise<void>
 */
export async function logAuditAction(params: AuditLogParams): Promise<void> {
  try {
    const { userId, action, entity, entityId, changes } = params;
    const { ipAddress, userAgent } = await getClientInfo();

    await prisma.surfboardAuditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw errors for audit logging failures
    // Just log them to avoid breaking the main operation
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Helper function to format changes for audit logging
 * @param before - State before the change
 * @param after - State after the change
 * @returns Object with before/after states
 */
export function formatChanges(
  before: Record<string, any> | null,
  after: Record<string, any> | null
): Record<string, any> {
  return {
    before: before || null,
    after: after || null,
  };
}

/**
 * Helper function to create a simple change log
 * @param changes - Key-value pairs of changes
 * @returns Formatted changes object
 */
export function createChangeLog(
  changes: Record<string, any>
): Record<string, any> {
  return changes;
}
