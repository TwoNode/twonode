import prisma from "@/lib/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { writeAudit } from "@/lib/audit";
import { Platform } from "@/utils/platform";
import {
  isTierSize,
  sortTiers,
  tierKeyFromName,
} from "@/gbc/utils/sponsorTiers";

/**
 * Sponsorship levels (Headline, Impact, ...) are admin-managed rows. A tier's
 * `key` is fixed when it is created — renaming only changes what visitors see —
 * so sponsors never lose their tier to a rename. A tier that sponsors still use
 * cannot be deleted: they would have nowhere to go.
 *
 * Route layer gates access (ADMIN/SUPERADMIN); `actorId` is for the audit trail.
 */

export type SponsorTierInput = {
  name: string;
  description?: string | null;
  size?: string;
};

function cleanName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    throw new ValidationError({ name: "Tier name must be 2 to 60 characters" });
  }
  return trimmed;
}

function cleanSize(size?: string) {
  if (size === undefined) return undefined;
  if (!isTierSize(size))
    throw new ValidationError({
      size: "Size must be FEATURED, STANDARD or COMPACT",
    });
  return size;
}

export async function getSponsorTiers() {
  return sortTiers(await prisma.gBCSponsorTier.findMany());
}

/** Tiers with how many sponsors sit in each — for the admin "Manage tiers" dialog. */
export async function getSponsorTiersWithCounts() {
  const rows = await prisma.gBCSponsorTier.findMany({
    include: { _count: { select: { sponsors: true } } },
  });
  return sortTiers(rows).map(({ _count, ...tier }) => ({
    ...tier,
    sponsorCount: _count.sponsors,
  }));
}

export async function createSponsorTier(
  input: SponsorTierInput,
  actorId?: string
) {
  const name = cleanName(input.name);
  const size = cleanSize(input.size) ?? "STANDARD";
  const key = tierKeyFromName(name);
  if (!key)
    throw new ValidationError({
      name: "Tier name must contain letters or numbers",
    });

  if (await prisma.gBCSponsorTier.findUnique({ where: { key } })) {
    throw new ConflictError(`A tier called "${name}" already exists`);
  }

  // New tiers go last.
  const last = await prisma.gBCSponsorTier.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const tier = await prisma.gBCSponsorTier.create({
    data: {
      key,
      name,
      size,
      description: input.description?.trim() || null,
      order: (last?.order ?? -1) + 1,
    },
  });

  await writeAudit(Platform.GBC, {
    userId: actorId,
    action: "CREATE_SPONSOR_TIER",
    entity: "GBCSponsorTier",
    entityId: key,
    changes: { name, size },
  });
  return tier;
}

export async function updateSponsorTier(
  key: string,
  patch: Partial<SponsorTierInput>,
  actorId?: string
) {
  if (!(await prisma.gBCSponsorTier.findUnique({ where: { key } })))
    throw new NotFoundError("Sponsor tier");

  const data: { name?: string; size?: string; description?: string | null } =
    {};
  if (patch.name !== undefined) data.name = cleanName(patch.name);
  if (patch.size !== undefined) data.size = cleanSize(patch.size);
  if (patch.description !== undefined)
    data.description = patch.description?.trim() || null;

  const tier = await prisma.gBCSponsorTier.update({ where: { key }, data });
  await writeAudit(Platform.GBC, {
    userId: actorId,
    action: "UPDATE_SPONSOR_TIER",
    entity: "GBCSponsorTier",
    entityId: key,
    changes: data,
  });
  return tier;
}

/** Sets the display order to the order of `keys`. Every tier must be listed exactly once. */
export async function reorderSponsorTiers(keys: string[], actorId?: string) {
  const existing = await prisma.gBCSponsorTier.findMany({
    select: { key: true },
  });
  const known = new Set(existing.map((t) => t.key));
  const unique = new Set(keys);
  if (
    unique.size !== keys.length ||
    keys.length !== known.size ||
    !keys.every((k) => known.has(k))
  ) {
    throw new ValidationError({ keys: "List every tier exactly once" });
  }

  await prisma.$transaction(
    keys.map((key, order) =>
      prisma.gBCSponsorTier.update({ where: { key }, data: { order } })
    )
  );
  await writeAudit(Platform.GBC, {
    userId: actorId,
    action: "REORDER_SPONSOR_TIERS",
    entity: "GBCSponsorTier",
    changes: { order: keys },
  });
  return getSponsorTiers();
}

export async function deleteSponsorTier(key: string, actorId?: string) {
  if (!(await prisma.gBCSponsorTier.findUnique({ where: { key } })))
    throw new NotFoundError("Sponsor tier");

  const inUse = await prisma.gBCSponsor.count({ where: { tier: key } });
  if (inUse > 0) {
    throw new ConflictError(
      `${inUse} sponsor${inUse === 1 ? " is" : "s are"} still in this tier. Move ${inUse === 1 ? "it" : "them"} to another tier first.`
    );
  }

  await prisma.gBCSponsorTier.delete({ where: { key } });
  await writeAudit(Platform.GBC, {
    userId: actorId,
    action: "DELETE_SPONSOR_TIER",
    entity: "GBCSponsorTier",
    entityId: key,
  });
}

/** Throws a field error if `key` is not a real tier — used when saving a sponsor. */
export async function assertSponsorTierExists(key: string) {
  if (
    !(await prisma.gBCSponsorTier.findUnique({
      where: { key },
      select: { key: true },
    }))
  ) {
    throw new ValidationError({ tier: "Choose one of the existing tiers" });
  }
}
