import crypto from "crypto";
import prisma from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { getPresignedDownloadUrl } from "@/app/(projects)/(reva)/reva/actions/awsActions";
import { sendDownloadOtpEmail } from "@/utils/email";
import { getUserContact } from "@/reva/services/propertyRequestService";
import { Platform } from "@/utils/platform";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

type ResolvedTarget = {
  url: string;
  recordEmail: string;
  userId: string | null;
};

/**
 * Shared by both request types — Property and OneTimeUserProperty have the
 * identical documentsUrls/report shape, so one function resolves a
 * "report" | "document:N" target against either row.
 */
function resolveTargetUrl(
  row: { documentsUrls: string[]; report: unknown },
  target: string
): string {
  if (target === "report") {
    const report = row.report as Record<string, unknown> | null;
    if (!report || typeof report !== "object" || !report.isApproved) {
      throw new ValidationError({ report: "Report is not yet approved" });
    }
    if (!("directFileLink" in report)) throw new NotFoundError("Report file");
    const link = report.directFileLink;
    // uploadToS3FromServer always returns string[], even for a single file.
    return Array.isArray(link) ? link[0] : (link as string);
  }

  const match = /^document:(\d+)$/.exec(target);
  if (!match) throw new ValidationError({ target: "Invalid target" });
  const url = row.documentsUrls?.[Number(match[1])];
  if (!url) throw new NotFoundError("Document");
  return url;
}

async function resolveOneTimeTarget(
  reference: string,
  email: string,
  target: string
): Promise<ResolvedTarget> {
  const request = await prisma.oneTimeUserProperty.findFirst({
    where: { reference, email },
  });
  if (!request) throw new NotFoundError("Request");
  return {
    url: resolveTargetUrl(request, target),
    recordEmail: request.email,
    userId: null,
  };
}

async function resolvePropertyTarget(
  reference: string,
  userId: string,
  target: string
): Promise<ResolvedTarget> {
  const property = await prisma.property.findFirst({
    where: { userId, OR: [{ reference }, { references: { has: reference } }] },
  });
  if (!property) throw new NotFoundError("Property");
  const user = await getUserContact(userId);
  return {
    url: resolveTargetUrl(property, target),
    recordEmail: user.email,
    userId,
  };
}

async function resolveTarget(input: {
  reference: string;
  target: string;
  email?: string;
  userId?: string;
}): Promise<ResolvedTarget> {
  const { reference, target, email, userId } = input;
  if (userId) return resolvePropertyTarget(reference, userId, target);
  if (email) return resolveOneTimeTarget(reference, email, target);
  throw new ValidationError({ email: "email or userId is required" });
}

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function requestDownloadOtp(input: {
  reference: string;
  target: string;
  email?: string;
  userId?: string;
}): Promise<{ message: string }> {
  const GENERIC_MESSAGE = {
    message:
      "If that request is valid, a code has been sent to the associated email.",
  };

  // Resolution failures (wrong email, wrong reference, not approved yet,
  // someone else's property) never surface to the caller as a distinct
  // error — same generic response either way, so this endpoint can't be
  // used to enumerate valid reference/email pairs or probe approval state.
  let resolved: ResolvedTarget;
  try {
    resolved = await resolveTarget(input);
  } catch {
    return GENERIC_MESSAGE;
  }

  const { reference, target } = input;
  const { recordEmail, userId } = resolved;

  // A fresh code invalidates any prior unused one for the same target —
  // an old forwarded/leaked code from an earlier resend stops working
  // immediately, which is what makes "requested fresh every time" real.
  await prisma.downloadOtp.updateMany({
    where: { reference, target, email: recordEmail, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateCode();
  await prisma.downloadOtp.create({
    data: {
      reference,
      target,
      email: recordEmail,
      userId,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  });

  const contact = userId ? await getUserContact(userId) : null;
  await sendDownloadOtpEmail({
    to: recordEmail,
    firstName: contact?.firstName ?? "",
    code,
    target,
    platform: Platform.REVA,
  });

  // Dev convenience only — never persisted anywhere but this log line.
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[dev] download OTP for ${recordEmail} (${reference}/${target}): ${code}`
    );
  }

  return GENERIC_MESSAGE;
}

export async function verifyDownloadOtpAndGetUrl(input: {
  reference: string;
  target: string;
  code: string;
  email?: string;
  userId?: string;
}): Promise<{ url: string }> {
  const { reference, target, code } = input;
  const { url, recordEmail } = await resolveTarget(input);

  const otp = await prisma.downloadOtp.findFirst({
    where: {
      reference,
      target,
      email: recordEmail,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp)
    throw new ValidationError({ code: "No active code — request a new one" });
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new ValidationError({
      code: "Too many attempts — request a new one",
    });
  }

  if (otp.codeHash !== hashCode(code)) {
    await prisma.downloadOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ValidationError({ code: "Incorrect code" });
  }

  await prisma.downloadOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  return { url: await getPresignedDownloadUrl(url) };
}
