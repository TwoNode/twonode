// app/(projects)/(surfboard)/actions/migrateSurfboardCsv.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath as revalidate } from "next/cache";
import { parse as parseCsv } from "csv-parse/sync";
import iconv from "iconv-lite";
import { z } from "zod";
import { randomUUID } from "crypto";
import { isValid as isDateValid } from "date-fns";

// ---------- Types ----------
type ApiResult<T = unknown> = {
  ok: boolean;
  message: string;
  data?: T;
  stats?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    usersCreated: number;
    durationMs: number;
    dbCountAfter?: number;
  };
  errors?: Array<{ row: number; planNumber?: string; error: string }>;
};

type UserLite = {
  id: string;
  kindeId: string | null;
  surconRegNumber: string | null;
};

// ---------- Expected headers (exact order not enforced here) ----------
// NOTE: The uploaded CSV files may use slightly different header names for file path columns
// (e.g. `pdfFilePath` instead of `pdfFilePaths`). We define the canonical set
// of expected headers here. During parsing we will map any known aliases to
// their canonical names so that the import can handle both variations. If a
// particular header is optional (like `state` in some legacy exports) it
// should not cause the header check to fail.
const EXPECTED_HEADERS = [
  "planNumber",
  "surveyTitle",
  "planType",
  "referencePlanNumber",
  "deededArea",
  "facilitator",
  "pillarType",
  "ward",
  "lcda",
  "lga",
  // canonical names for file path columns
  "pdfFilePaths",
  "cadFilePaths",
  "certificateFilePaths",
  "createdAt",
  "updatedAt",
  "isLive",
  "pillars",
  "id",
  "geometry",
  "status",
  "dateOnSurveyPlan",
  "userId",
  "reasonForWithdrawalAndResubmission",
  "sharedTo",
  "dateLodged",
  // `state` may appear in some CSVs but is optional and ignored
  // Optional SURCON registration number
  "SURCONRegNum",
];

// Mapping of canonical header names to potential aliases found in CSV files.
// When a header defined in EXPECTED_HEADERS is not present in the uploaded CSV
// we will check this mapping to see if an alias is present. If found, we
// consider the header satisfied and will copy the alias column to the
// canonical name during record normalization.
const HEADER_ALIASES: Record<string, string> = {
  pdfFilePaths: "pdfFilePath",
  cadFilePaths: "cadFilePath",
  certificateFilePaths: "certificateFilePath",
};

// ---------- CSV Schema (make planNumber REQUIRED) ----------
const RowSchema = z.object({
  planNumber: z.string().min(1, "planNumber is required"), // <- REQUIRED
  surveyTitle: z.string().optional(),
  planType: z.string().optional(),
  referencePlanNumber: z.string().nullish(),
  deededArea: z.string().nullish(),
  facilitator: z.string().nullish(),
  pillarType: z.string().nullish(),
  ward: z.string().nullish(),
  lcda: z.string().nullish(),
  lga: z.string().nullish(),
  pdfFilePaths: z.string().nullish(),
  cadFilePaths: z.string().nullish(),
  certificateFilePaths: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  isLive: z.string().nullish(),
  pillars: z.string().nullish(),
  id: z.string().nullish(),
  geometry: z.string().nullish(),
  status: z.string().nullish(),
  dateOnSurveyPlan: z.string().nullish(),
  userId: z.string().nullish(),
  reasonForWithdrawalAndResubmission: z.string().nullish(),
  sharedTo: z.string().nullish(),
  dateLodged: z.string().nullish(),
  SURCONRegNum: z.string().nullish(),
  // Additional optional column seen in some exports; ignored during import.
  state: z.string().nullish(),
});

// ---------- Small utils ----------
const EMPTY = new Set(["", " ", "null", "undefined", "-"]);
const toNull = (v?: string | null) =>
  v == null ? null : EMPTY.has(v.trim()) ? null : v.trim();
const hasUuidShape = (s?: string | null) =>
  !!toNull(s)?.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );

const normalizeSurcon = (s?: string | null) => {
  const t = toNull(s);
  return t ? t.replace(/\s+/g, "_").toUpperCase() : null; // why: enforce canonical uniqueness
};

const parseIsoDate = (input?: string | null): Date | undefined => {
  const raw = toNull(input);
  if (!raw) return undefined;
  const variants = new Set<string>([
    raw,
    raw.replace(/\//g, "-"),
    raw.replace(/^(\d{2})-(\d{2})-(\d{2})$/, "20$3-$1-$2"),
    raw.replace(/^(\d{2})\/(\d{2})\/(\d{2})$/, "20$3-$1-$2"),
  ]);
  for (const c of variants) {
    const d = new Date(c);
    if (isDateValid(d)) return d;
  }
  return undefined;
};

const parseJsonSafe = <T = unknown>(s?: string | null): T | undefined => {
  const t = toNull(s);
  if (!t) return undefined;
  try {
    return JSON.parse(t) as T;
  } catch {
    return undefined;
  }
};

const toStringArray = (v?: string | null): string[] => {
  const j = parseJsonSafe<unknown>(v);
  if (Array.isArray(j)) return j.map((x) => String(x).trim()).filter(Boolean);
  const s = toNull(v);
  if (!s) return [];
  return s
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
};

const toFilePaths = (v?: string | null): string[] => {
  const arr = toStringArray(v);
  return arr.length ? arr : toNull(v) ? [toNull(v)!] : [];
};

const decodeBufferToText = (buf: ArrayBuffer): string => {
  const nodeBuf = Buffer.from(buf);
  const utf8 = iconv.decode(nodeBuf, "utf8");
  const text = utf8.includes("\uFFFD")
    ? iconv.decode(nodeBuf, "win1252")
    : utf8;
  return text.replace(/^\uFEFF/, "");
};

// ---------- Normalization ----------
type Normalized = {
  row: number;
  planNumber: string;
  createData: Parameters<typeof prisma.surfboardPlan.create>[0]["data"];
  updateData: Parameters<typeof prisma.surfboardPlan.update>[0]["data"];
  csvUserId?: string | null;
  csvSurconCanon?: string | null;
};

const normalizeRow = (
  raw: Record<string, unknown>,
  rowIndex: number
): Normalized => {
  const parsed = RowSchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [
        k.trim(),
        typeof v === "string" ? v : String(v ?? ""),
      ])
    )
  );

  const planNumber = parsed.planNumber.trim(); // now guaranteed non-empty

  const pillars = parseJsonSafe<any>(parsed.pillars);
  const geometry = parseJsonSafe<any>(parsed.geometry);
  const validGeometry =
    geometry &&
    typeof geometry === "object" &&
    (geometry.type === "Polygon" || geometry.type === "MultiPolygon");

  const baseData = {
    planNumber,
    surveyTitle: toNull(parsed.surveyTitle) ?? "",
    planType: toNull(parsed.planType) ?? "",
    referencePlanNumber: toNull(parsed.referencePlanNumber),
    deededArea: toNull(parsed.deededArea) ?? "",
    facilitator: toNull(parsed.facilitator ?? "") ?? "",
    pillarType: toNull(parsed.pillarType) ?? "",
    ward: toNull(parsed.ward) ?? "",
    lcda: toNull(parsed.lcda) ?? "",
    lga: toNull(parsed.lga) ?? "",
    pdfFilePaths: toFilePaths(parsed.pdfFilePaths),
    cadFilePaths: toFilePaths(parsed.cadFilePaths),
    certificateFilePaths: toFilePaths(parsed.certificateFilePaths),
    status: (toNull(parsed.status) as any) ?? undefined,
    reasonForWithdrawalAndResubmission:
      toNull(parsed.reasonForWithdrawalAndResubmission) ?? undefined,
    sharedTo: toStringArray(parsed.sharedTo),
    pillars: Array.isArray(pillars) ? (pillars as any) : undefined,
    geometry: validGeometry ? (geometry as any) : undefined,
    dateOnSurveyPlan: parseIsoDate(parsed.dateOnSurveyPlan) ?? undefined,
    dateLodged: parseIsoDate(parsed.dateLodged) ?? undefined,
    isLive: (() => {
      const s = toNull(parsed.isLive)?.toLowerCase();
      if (s == null) return undefined;
      if (["1", "true", "yes", "y"].includes(s)) return true;
      if (["0", "false", "no", "n"].includes(s)) return false;
      return undefined;
    })(),
    createdAt: parseIsoDate(parsed.createdAt) ?? undefined,
    updatedAt: parseIsoDate(parsed.updatedAt) ?? undefined,
  } satisfies Parameters<typeof prisma.surfboardPlan.create>[0]["data"];

  const createData = {
    ...(hasUuidShape(parsed.id) ? { id: parsed.id!.trim() } : {}),
    ...baseData,
  } as Parameters<typeof prisma.surfboardPlan.create>[0]["data"];

  const {
    createdAt: _c,
    updatedAt: _u,
    ...updateData
  } = { ...baseData } as Parameters<
    typeof prisma.surfboardPlan.update
  >[0]["data"];

  return {
    row: rowIndex,
    planNumber,
    createData,
    updateData,
    csvUserId: toNull(parsed.userId),
    csvSurconCanon: normalizeSurcon(parsed.SURCONRegNum),
  };
};

// ---------- User preload / ensure (unchanged core, trimmed for brevity) ----------
const preloadUsers = async (csvIds: string[], surconsCanon: string[]) => {
  if (!csvIds.length && !surconsCanon.length) return [] as UserLite[];
  return (await prisma.surfboardUser.findMany({
    where: {
      OR: [
        csvIds.length ? { id: { in: csvIds } } : undefined,
        csvIds.length ? { kindeId: { in: csvIds } } : undefined,
        surconsCanon.length
          ? { surconRegNumber: { in: surconsCanon } }
          : undefined,
      ].filter(Boolean) as any,
    },
    select: { id: true, kindeId: true, surconRegNumber: true },
  })) as UserLite[];
};

const buildUserMaps = (users: UserLite[]) => {
  const byId = new Map<string, UserLite>();
  const byKinde = new Map<string, UserLite>();
  const bySurconCanon = new Map<string, UserLite>();
  for (const u of users) {
    byId.set(u.id, u);
    if (u.kindeId) byKinde.set(u.kindeId, u);
    if (u.surconRegNumber)
      bySurconCanon.set(normalizeSurcon(u.surconRegNumber)!, u);
  }
  return { byId, byKinde, bySurconCanon };
};

type NeedUser = { csvUserId?: string | null; surconCanon?: string | null };

type STATUSES = "PENDING" | "LODGED" | "QUERIED" | "UNDER_REVIEW";

const normalizeStatus = (s?: string | null): STATUSES => {
  if (!s) return "PENDING";

  const t = s.trim().toUpperCase();

  if (/^PENDING$/.test(t)) return "PENDING";
  else if (/^LODGED$/.test(t)) return "LODGED";

  return "PENDING";
};

const ensureUsers = async (needs: NeedUser[], batchSize: number) => {
  const uniqueMap = new Map<string, NeedUser>();
  for (const n of needs) {
    const key = n.surconCanon
      ? `surcon:${n.surconCanon}`
      : n.csvUserId
      ? `kinde:${n.csvUserId}`
      : null;
    if (!key) continue;
    if (!uniqueMap.has(key)) uniqueMap.set(key, n);
  }
  const unique = Array.from(uniqueMap.values());
  if (!unique.length) return { created: 0, users: [] as UserLite[] };

  const users: UserLite[] = [];
  for (let i = 0; i < unique.length; i += batchSize) {
    const chunk = unique.slice(i, i + batchSize);
    const tx = chunk.map((n) => {
      if (n.surconCanon) {
        const sur = n.surconCanon;
        const kid = toNull(n.csvUserId) ?? undefined;
        const email = `csv-import+${randomUUID()}@placeholder.local`;
        return prisma.surfboardUser.upsert({
          where: { surconRegNumber: sur }, // requires @unique
          update: {},
          create: {
            kindeId: kid ?? `csv-${randomUUID()}`,
            email,
            firstName: "CSV",
            lastName: "Import",
            surconRegNumber: sur,
          },
          select: { id: true, kindeId: true, surconRegNumber: true },
        });
      }
      const kid = toNull(n.csvUserId)!;
      const email = `csv-import+${randomUUID()}@placeholder.local`;
      return prisma.surfboardUser.upsert({
        where: { kindeId: kid },
        update: {},
        create: {
          kindeId: kid,
          email,
          firstName: "CSV",
          lastName: "Import",
          surconRegNumber: null,
        },
        select: { id: true, kindeId: true, surconRegNumber: true },
      });
    });
    const res = await prisma.$transaction(tx);
    users.push(...(res as unknown as UserLite[]));
  }
  return { created: users.length, users };
};

// ---------- Server Action ----------
export async function migrateSurfboardCsvAction(
  formData: FormData,
  opts?: { dryRun?: boolean; batchSize?: number; revalidatePath?: string }
): Promise<ApiResult<{ sample: Array<{ row: number; planNumber: string }> }>> {
  const started = Date.now();
  const dryRun = opts?.dryRun ?? false;
  const batchSize = Math.max(1, Math.min(250, opts?.batchSize ?? 100));

  const file = formData.get("file");
  if (!(file instanceof File))
    return { ok: false, message: "FormData must include a CSV 'file' entry." };

  const buf = await file.arrayBuffer();
  const csvText = decodeBufferToText(buf);

  // Parse
  const records = parseCsv(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
    trim: true,
  }) as Array<Record<string, unknown>>;
  if (!records.length)
    return { ok: false, message: "CSV contains no data rows." };

  // Header sanity: the first record should contain these keys
  const firstKeys = new Set(Object.keys(records[0] ?? {}).map((k) => k.trim()));
  // Determine which expected headers are missing from the CSV. If a header is
  // absent but an alias exists, treat it as present. Optional columns should not
  // cause the check to fail.
  const missing: string[] = [];
  for (const h of EXPECTED_HEADERS) {
    // Skip check for optional headers (currently none are marked optional here).
    const alias = HEADER_ALIASES[h as keyof typeof HEADER_ALIASES];
    if (!firstKeys.has(h) && !(alias && firstKeys.has(alias))) {
      missing.push(h);
    }
  }
  console.log(firstKeys, missing);
  if (missing.length) {
    return {
      ok: false,
      message:
        `CSV header check failed. Missing columns: ${missing.join(", ")}. ` +
        `Ensure the FIRST ROW is the header line or provide appropriate column aliases.`,
    };
  }

  // Normalize column names across all records by copying any alias column to
  // its canonical name if the canonical column is missing or empty. This allows
  // uploaded CSVs that use singular file path column names (e.g. pdfFilePath)
  // to be processed without error.
  for (const rec of records) {
    for (const [canon, alias] of Object.entries(HEADER_ALIASES)) {
      // Only copy if canonical is missing or nullish and alias exists
      const aliasValue = (rec as any)[alias];
      if (
        ((rec as any)[canon] === undefined ||
          (rec as any)[canon] === null ||
          (rec as any)[canon] === "") &&
        aliasValue != null &&
        aliasValue !== ""
      ) {
        (rec as any)[canon] = aliasValue;
      }
      // Remove the alias column entirely to avoid unknown-key errors in zod
      if (alias in rec) {
        delete (rec as any)[alias];
      }
    }
  }

  const normalized: Normalized[] = [];
  const errors: ApiResult["errors"] = [];
  let skipped = 0;

  for (let i = 0; i < records.length; i++) {
    try {
      const n = normalizeRow(records[i], i + 2);
      // Guard: never allow empty planNumber (extra safety even with zod)
      if (!n.planNumber) {
        skipped += 1;
        errors.push({
          row: i + 2,
          planNumber: "",
          error: "Empty planNumber; row skipped.",
        });
        continue;
      }
      normalized.push(n);
    } catch (e: any) {
      errors.push({
        row: i + 2,
        planNumber: String((records[i] as any)?.planNumber ?? ""),
        error: e?.message ?? "Row normalization failed",
      });
    }
  }

  const okRows = normalized.length;
  const total = records.length;
  let created = 0,
    updated = 0,
    failed = errors.length,
    usersCreated = 0;

  // Preload/ensure users
  const csvIds = Array.from(
    new Set(normalized.map((n) => n.csvUserId).filter(Boolean))
  ) as string[];
  const surconsCanon = Array.from(
    new Set(normalized.map((n) => n.csvSurconCanon).filter(Boolean))
  ) as string[];
  const existing = await preloadUsers(csvIds, surconsCanon);
  let maps = buildUserMaps(existing);

  const needsCreate: NeedUser[] = [];
  for (const n of normalized) {
    const uid = toNull(n.csvUserId ?? undefined);
    const byId = uid ? maps.byId.get(uid) ?? maps.byKinde.get(uid) : undefined;
    const bySur = n.csvSurconCanon
      ? maps.bySurconCanon.get(n.csvSurconCanon)
      : undefined;
    if (!byId && !bySur && (uid || n.csvSurconCanon)) {
      needsCreate.push({
        csvUserId: uid ?? null,
        surconCanon: n.csvSurconCanon ?? null,
      });
    }
  }

  if (!dryRun && needsCreate.length) {
    const { created: uc, users } = await ensureUsers(
      needsCreate,
      Math.min(batchSize, 50)
    );
    usersCreated += uc;
    const newly = buildUserMaps(users);
    for (const [k, v] of newly.byId) maps.byId.set(k, v);
    for (const [k, v] of newly.byKinde) maps.byKinde.set(k, v);
    for (const [k, v] of newly.bySurconCanon) maps.bySurconCanon.set(k, v);
  }

  // Attach user connects
  for (const n of normalized) {
    const uid = toNull(n.csvUserId ?? undefined);
    const user =
      (uid && (maps.byId.get(uid) ?? maps.byKinde.get(uid))) ||
      (n.csvSurconCanon ? maps.bySurconCanon.get(n.csvSurconCanon) : undefined);
    if (user) {
      (n.createData as any).user = { connect: { id: user.id } };
      (n.updateData as any).user = { connect: { id: user.id } };
    }
  }

  // Upsert plans
  if (!dryRun && okRows) {
    for (let i = 0; i < normalized.length; i += batchSize) {
      const batch = normalized.slice(i, i + batchSize);
      try {
        await prisma.$transaction(
          batch.map(({ planNumber, createData, updateData }) =>
            prisma.surfboardPlan.upsert({
              where: { planNumber },
              create: {
                ...createData,
                status: normalizeStatus((createData?.status as string) || ""),
                pillars: createData.pillars || "[]",
                geometry: createData.geometry || "{}",
              },
              update: {
                ...updateData,
                status: normalizeStatus((updateData.status as string) || ""),
                pillars: updateData.pillars || "[]",
                geometry: updateData.geometry || "{}",
              },
            })
          )
        );
        // classify stats best-effort
        const ids = batch.map((b) => b.planNumber);
        const after = await prisma.surfboardPlan.findMany({
          where: { planNumber: { in: ids } },
          select: { planNumber: true, createdAt: true, updatedAt: true },
        });
        const m = new Map(after.map((e) => [e.planNumber, e]));
        for (const b of batch) {
          const r = m.get(b.planNumber)!;
          if (Math.abs(r.createdAt.getTime() - r.updatedAt.getTime()) < 1200)
            created += 1;
          else updated += 1;
        }
      } catch {
        for (const { row, planNumber, createData, updateData } of batch) {
          try {
            await prisma.surfboardPlan.upsert({
              where: { planNumber },
              create: {
                ...createData,
                status: normalizeStatus(createData.status as string),
                pillars: createData.pillars || "[]",
                geometry: createData.geometry || "{}",
              },
              update: {
                ...updateData,
                status: normalizeStatus((updateData.status as string) || ""),
                pillars: updateData.pillars || "[]",
                geometry: updateData.geometry || "{}",
              },
            });
            updated += 1;
          } catch (err: any) {
            failed += 1;
            errors.push({
              row,
              planNumber,
              error: err?.message ?? "Upsert failed",
            });
          }
        }
      }
    }
  } else {
    skipped += okRows; // dry-run: count all processed as skipped (no writes)
  }

  // Post-import DB sanity
  let dbCountAfter: number | undefined = undefined;
  if (!dryRun) {
    try {
      dbCountAfter = await prisma.surfboardPlan.count();
    } catch {}
  }

  if (opts?.revalidatePath) {
    try {
      revalidate(opts.revalidatePath);
    } catch {}
  }

  const durationMs = Date.now() - started;
  const message = dryRun
    ? `Dry-run OK: ${okRows}/${total} normalized; skipped=${skipped}; failed=${failed}.`
    : `Import done: created=${created}, updated=${updated}, failed=${failed}, skipped=${skipped}, usersCreated≈${usersCreated}.`;

  // Include first few planNumbers to eyeball non-empty keys
  const samplePlans = normalized.slice(0, 5).map((n) => n.planNumber);

  return {
    ok: failed === 0,
    message,
    stats: {
      total,
      created,
      updated,
      skipped,
      failed,
      usersCreated,
      durationMs,
      dbCountAfter,
    },
    errors,
    data: {
      sample: samplePlans.map((p, i) => ({ row: i + 2, planNumber: p })),
    },
  };
}
