import prisma from "@/lib/prisma";
import { ApiError, NotFoundError, RateLimitError } from "@/lib/api/errors";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import {
  extractS3KeyFromUrl,
  getPresignedDownloadUrl,
} from "@/surfboard/services/awsService";
import { planFiles, UUID } from "@/surfboard/services/planDetailService";
import {
  countPages,
  MAX_PAGES,
  renderPage,
} from "@/surfboard/services/protectedPageRenderer";
import {
  isSafeStorageKey,
  keyBelongsToAllowedUser,
} from "@/surfboard/utils/fileAccess";
import { watermarkText } from "@/surfboard/utils/sharedFileView";

/**
 * The survey plan(s) and the Certificate of a plan shared with the caller, as watermarked page
 * pictures (TASK-0015 in the app repo, decisions D1 to D5 of 2026-11-25). A person a plan was shared
 * with never receives the original file: the page routes are the only way to see these two kinds,
 * each page carries `Draft_{SURCON No}` of the sharing surveyor burned into it, and every answer is
 * `no-store`. The owner is not served here (an owner opens their own files as before).
 */

export type ProtectedFileInfo = {
  /** How many pages there are (1 for a picture). */
  pages: number;
  /** The website's name for the file. */
  name: string;
  kind: "SURVEY_PLAN" | "CERTIFICATE";
};

const INDEX = /^\d{1,4}$/;
const PAGE = /^\d{1,3}$/;

/** A file larger than this is refused rather than held in memory (a survey plan is a few MB). */
const MAX_BYTES = 60 * 1024 * 1024;

/** Page pictures an account may ask for in an hour: far more than anyone reads, far less than a scraper wants. */
export const PAGE_LIMIT = 400;
const PAGE_WINDOW_MS = 60 * 60 * 1000;

type Loaded = {
  ref: string;
  name: string;
  format: string;
  kind: ProtectedFileInfo["kind"];
  watermark: string;
};

async function load(
  userId: string,
  planId: string,
  position: string
): Promise<Loaded> {
  // Anything that cannot be a file of a plan is the same answer as a file that is not there.
  if (!UUID.test(planId) || !INDEX.test(position))
    throw new NotFoundError("File");

  const row = await prisma.surfboardPlan.findFirst({
    where: { id: planId, deleted: false, sharedTo: { has: userId } },
    select: {
      userId: true,
      planNumber: true,
      redCopyFileUrl: true,
      pdfFilePaths: true,
      cadFilePaths: true,
      certificateFilePaths: true,
      user: { select: { surconRegNumber: true } },
    },
  });
  // Someone else's plan, and a plan the caller owns (they open their own files directly), are
  // both the same answer as no file.
  if (!row || row.userId === userId) throw new NotFoundError("File");

  const file = planFiles(row, false)[Number(position)];
  if (!file || !file.protected) throw new NotFoundError("File");
  if (!file.viewable) {
    throw new ApiError(
      422,
      "FILE_NOT_VIEWABLE",
      "This kind of file can't be opened on a phone"
    );
  }

  // A plan's file fields are editable by its owner, so being listed proves nothing (ADR-0012):
  // the key must be well formed and sit in the owner's own folder.
  const key = extractS3KeyFromUrl(file.ref);
  if (
    !isSafeStorageKey(key) ||
    !keyBelongsToAllowedUser(key, [row.userId ?? ""])
  ) {
    throw new NotFoundError("File");
  }

  return {
    ref: file.ref,
    name: file.name,
    format: file.format,
    kind: file.kind as ProtectedFileInfo["kind"],
    watermark: watermarkText(row.user?.surconRegNumber),
  };
}

// A few files stay in memory for a short while, so reading a plan's pages one after the other does
// not fetch the same file from storage once per page. Authorisation is checked on every request
// before this is looked at, so a cached file is never served to someone who may not have it.
const KEEP_MS = 2 * 60 * 1000;
const KEEP_FILES = 3;
const kept = new Map<string, { bytes: Uint8Array; at: number }>();

/** Forgets every kept file (the tests start each case with none). */
export function clearKeptFiles(): void {
  kept.clear();
}

async function bytesOf(ref: string): Promise<Uint8Array> {
  const now = Date.now();
  for (const [key, entry] of kept) {
    if (now - entry.at > KEEP_MS) kept.delete(key);
  }
  const hit = kept.get(ref);
  if (hit) return hit.bytes;

  const url = await getPresignedDownloadUrl(ref, 60);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new NotFoundError("File");
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    throw new ApiError(
      422,
      "FILE_NOT_VIEWABLE",
      "This file is too large to open on a phone"
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    throw new ApiError(
      422,
      "FILE_NOT_VIEWABLE",
      "This file is too large to open on a phone"
    );
  }

  kept.set(ref, { bytes, at: now });
  while (kept.size > KEEP_FILES) {
    const oldest = kept.keys().next().value;
    if (oldest === undefined) break;
    kept.delete(oldest);
  }
  return bytes;
}

async function spend(userId: string): Promise<void> {
  const allowed = await consumeRateLimit(`file-page:${userId}`, userId, {
    windowMs: PAGE_WINDOW_MS,
    max: PAGE_LIMIT,
  });
  if (!allowed) throw new RateLimitError();
}

/** How many pages the file has, and what it is called. */
export async function getProtectedFileInfo(
  userId: string,
  planId: string,
  position: string
): Promise<ProtectedFileInfo> {
  const file = await load(userId, planId, position);
  await spend(userId);
  const pages = await countPages(await bytesOf(file.ref), file.format);
  if (pages > MAX_PAGES) {
    throw new ApiError(
      422,
      "FILE_NOT_VIEWABLE",
      "This file is too long to open on a phone"
    );
  }
  return { pages, name: file.name, kind: file.kind };
}

/** One page as a watermarked JPEG; `page` counts from 1. */
export async function getProtectedPage(
  userId: string,
  planId: string,
  position: string,
  page: string
): Promise<Buffer> {
  if (!PAGE.test(page) || Number(page) < 1) throw new NotFoundError("Page");
  const file = await load(userId, planId, position);
  await spend(userId);
  return renderPage(
    await bytesOf(file.ref),
    file.format,
    Number(page),
    file.watermark
  );
}
