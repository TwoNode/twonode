import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/api/errors";
import type { GBCEdition } from "@/gbc/utils/settings";

/**
 * Editions live in their own gbc_editions table (see the GBCEdition model's
 * doc comment in prisma/schema/gbc.prisma) — promoted out of the
 * GBCSettings JSON blob they started in (phase-4-gbc.md's edition-metadata
 * plan) once a real gap showed up: nothing validated the tag columns on
 * GBCTicket/GBCSponsor/GBCPartner/GBCSpeaker/GBCEventStats against the JSON
 * array, and there was no DB-level way to enforce "exactly one ACTIVE".
 *
 * The app-level "exactly one ACTIVE" invariant stays here (activateEdition()
 * refuses to run while another edition is already ACTIVE rather than
 * silently demoting it, so activate/archive stay two deliberate,
 * independent admin actions) — a partial unique index on
 * gbc_editions(status) WHERE status = 'ACTIVE' now backs it up at the DB
 * level too (added via raw SQL, see prisma/migrations/manual_gbc_editions.sql,
 * since Prisma's schema DSL can't express a partial index).
 */

function toGBCEdition(row: {
  key: string;
  name: string;
  theme: string;
  subTheme: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  status: string;
  ticketPrefix: string;
}): GBCEdition {
  return {
    key: row.key,
    name: row.name,
    theme: row.theme,
    subTheme: row.subTheme,
    venue: row.venue,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    status: row.status as GBCEdition["status"],
    ticketPrefix: row.ticketPrefix,
  };
}

export async function getEditions(): Promise<GBCEdition[]> {
  const rows = await prisma.gBCEdition.findMany({ orderBy: [{ startDate: "desc" }] });
  return rows.map(toGBCEdition);
}

export async function getActiveEdition(): Promise<GBCEdition | null> {
  const row = await prisma.gBCEdition.findFirst({ where: { status: "ACTIVE" } });
  return row ? toGBCEdition(row) : null;
}

async function getEditionOrThrow(key: string) {
  const edition = await prisma.gBCEdition.findUnique({ where: { key } });
  if (!edition) throw new NotFoundError("Edition");
  return edition;
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
  const edition = toGBCEdition(await getEditionOrThrow(key));
  const { ticketsSold, sponsors, speakers } = await editionStats(key);
  return { edition, attendeeCount: ticketsSold, sponsors, speakers };
}

/** Revenue included — admin-only, backs the event-switcher's read-only past-edition view. */
export async function getEditionAdminStats(key: string) {
  const edition = toGBCEdition(await getEditionOrThrow(key));
  const stats = await editionStats(key);
  return { edition, ...stats };
}

export type CreateEditionInput = Omit<GBCEdition, "status"> & { status?: GBCEdition["status"] };

export async function createEdition(data: CreateEditionInput, userId: string): Promise<GBCEdition[]> {
  const existing = await prisma.gBCEdition.findUnique({ where: { key: data.key } });
  if (existing) {
    throw new ValidationError({ key: `An edition with key "${data.key}" already exists` });
  }

  await prisma.gBCEdition.create({
    data: {
      key: data.key,
      name: data.name,
      theme: data.theme,
      subTheme: data.subTheme,
      venue: data.venue,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status ?? "UPCOMING",
      ticketPrefix: data.ticketPrefix,
    },
  });
  await prisma.gBCAuditLog.create({
    data: { userId, action: "CREATE_EDITION", entity: "GBCEdition", entityId: data.key, changes: JSON.stringify(data) },
  });

  return getEditions();
}

export async function activateEdition(key: string, userId: string): Promise<GBCEdition[]> {
  const target = await getEditionOrThrow(key);
  if (target.status === "ACTIVE") return getEditions();

  const currentlyActive = await prisma.gBCEdition.findFirst({ where: { status: "ACTIVE" } });
  if (currentlyActive) {
    throw new ConflictError(`Edition "${currentlyActive.key}" is already active — archive it first`);
  }

  await prisma.gBCEdition.update({ where: { key }, data: { status: "ACTIVE" } });
  await prisma.gBCAuditLog.create({
    data: { userId, action: "ACTIVATE_EDITION", entity: "GBCEdition", entityId: key, changes: JSON.stringify({ key, status: "ACTIVE" }) },
  });

  return getEditions();
}

export async function archiveEdition(key: string, userId: string): Promise<GBCEdition[]> {
  await getEditionOrThrow(key);

  await prisma.gBCEdition.update({ where: { key }, data: { status: "PAST" } });
  await prisma.gBCAuditLog.create({
    data: { userId, action: "ARCHIVE_EDITION", entity: "GBCEdition", entityId: key, changes: JSON.stringify({ key, status: "PAST" }) },
  });

  return getEditions();
}
