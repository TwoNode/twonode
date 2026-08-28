import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/api/errors";
import { getSettings, replaceEditions } from "@/gbc/services/settingsService";
import type { GBCEdition } from "@/gbc/utils/settings";

/**
 * New service (spec step 9) — editions live inside GBCSettings.settings
 * (see the edition-metadata migration, step 8), not their own table.
 * Enforces the "exactly one ACTIVE edition" invariant here, not in the DB
 * (settings is JSON) — activateEdition() refuses to run while another
 * edition is already ACTIVE rather than silently demoting it, so
 * activate/archive stay two deliberate, independent admin actions.
 */

export async function getEditions(): Promise<GBCEdition[]> {
  const settings = await getSettings();
  return settings.editions;
}

export async function getActiveEdition(): Promise<GBCEdition | null> {
  const settings = await getSettings();
  return settings.editions.find((e) => e.status === "ACTIVE") ?? null;
}

async function getEditionOrThrow(key: string): Promise<{ edition: GBCEdition; all: GBCEdition[] }> {
  const settings = await getSettings();
  const edition = settings.editions.find((e) => e.key === key);
  if (!edition) throw new NotFoundError("Edition");
  return { edition, all: settings.editions };
}

async function editionStats(key: string) {
  const [ticketsSold, checkedIn, revenueAgg, sponsors, speakers] = await Promise.all([
    prisma.gBCTicket.count({ where: { edition: key, paymentStatus: "COMPLETED" } }),
    prisma.gBCTicket.count({ where: { edition: key, checkedIn: true } }),
    prisma.gBCTicket.aggregate({ where: { edition: key, paymentStatus: "COMPLETED" }, _sum: { price: true } }),
    prisma.gBCSponsor.findMany({ where: { edition: key, visible: true }, orderBy: [{ order: "asc" }] }),
    prisma.gBCSpeaker.findMany({ where: { edition: key, visible: true }, orderBy: [{ order: "asc" }] }),
  ]);
  return { ticketsSold, checkedIn, revenue: revenueAgg._sum.price || 0, sponsors, speakers };
}

/** No revenue — backs the public Past Editions page. */
export async function getEditionPublicRecap(key: string) {
  const { edition } = await getEditionOrThrow(key);
  const { ticketsSold, sponsors, speakers } = await editionStats(key);
  return { edition, attendeeCount: ticketsSold, sponsors, speakers };
}

/** Revenue included — admin-only, backs the event-switcher's read-only past-edition view. */
export async function getEditionAdminStats(key: string) {
  const { edition } = await getEditionOrThrow(key);
  const stats = await editionStats(key);
  return { edition, ...stats };
}

export type CreateEditionInput = Omit<GBCEdition, "status"> & { status?: GBCEdition["status"] };

export async function createEdition(data: CreateEditionInput, userId: string): Promise<GBCEdition[]> {
  const settings = await getSettings();
  if (settings.editions.some((e) => e.key === data.key)) {
    throw new ValidationError({ key: `An edition with key "${data.key}" already exists` });
  }
  const newEdition: GBCEdition = { ...data, status: data.status ?? "UPCOMING" };
  return replaceEditions([...settings.editions, newEdition], userId, "CREATE_EDITION");
}

export async function activateEdition(key: string, userId: string): Promise<GBCEdition[]> {
  const { all } = await getEditionOrThrow(key);
  const target = all.find((e) => e.key === key)!;
  if (target.status === "ACTIVE") return all;

  const currentlyActive = all.find((e) => e.status === "ACTIVE");
  if (currentlyActive) {
    throw new ConflictError(`Edition "${currentlyActive.key}" is already active — archive it first`);
  }

  const updated = all.map((e) => (e.key === key ? { ...e, status: "ACTIVE" as const } : e));
  return replaceEditions(updated, userId, "ACTIVATE_EDITION");
}

export async function archiveEdition(key: string, userId: string): Promise<GBCEdition[]> {
  const { all } = await getEditionOrThrow(key);
  const updated = all.map((e) => (e.key === key ? { ...e, status: "PAST" as const } : e));
  return replaceEditions(updated, userId, "ARCHIVE_EDITION");
}
