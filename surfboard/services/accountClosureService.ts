import crypto from "crypto";
import prisma from "@/lib/prisma";
import {
  ApiError,
  UnauthenticatedError,
  ValidationError,
} from "@/lib/api/errors";
import { verifyPassword } from "@/lib/auth/passwordCheck";
import { disableSubscription } from "@/surfboard/services/paystackSubscriptionService";
import { deleteMultipleSurfboardFilesFromS3WithUrl } from "@/surfboard/services/awsService";
import { logAuditAction } from "@/app/(projects)/(surfboard)/utils/auditLogger";
import { sendAccountClosedNotice } from "@/utils/email";
import { Platform } from "@/utils/platform";

/**
 * Closing a surveyor's account (decision D13, reversed 2026-11-17: the app can create accounts, so
 * it must also close them, Apple 5.1.1(v) and Google Play's account-deletion rule).
 *
 * The maintainer's rule (2026-11-18): CLOSE AND ANONYMISE, KEEP EVERY PLAN. The account row stays
 * (plans, batches, payments, withdrawals and audit entries point at it and are records the privacy
 * text says we may have to keep) but everything that says who the person is is erased or replaced,
 * the account can no longer sign in, and the address becomes free for a new, empty account.
 *
 * ERASED or replaced: name, email, password, phone, address, company, logo, signature, SURCON
 * number and name, prefix and suffix, state, postal code, payer id, bank details, every session,
 * push device and push setting, pending sign-up, password and verification tokens, sign-in
 * attempt records that name the address, plans shared with the person (they are taken off the
 * owners' lists), invitations to the address, the person's private files on others' plans, and the
 * payment card token on the subscription (which is cancelled first).
 *
 * KEPT: the plans (including those never submitted), batches, payment, subscription (without the
 * card token and email) and withdrawal records (a withdrawal keeps the bank details it paid to),
 * the earnings ledger, comments, audit entries, the consent record (without the email), and the
 * notices sent to the person (nobody else can read them). Plans the person shared stay shared:
 * the people they were shared with keep working with the record.
 *
 * REFUSED while the person has money or an unpaid withdrawal, so nothing is silently lost.
 */

export type ClosureBlocker = "WALLET_BALANCE" | "PENDING_WITHDRAWAL";

/** What stops a closure now (empty when nothing does). The app shows these before asking for the password. */
export async function closureBlockers(
  userId: string
): Promise<ClosureBlocker[]> {
  const [wallet, openWithdrawals] = await Promise.all([
    prisma.surveyorWallet.findUnique({
      where: { userId },
      select: { availableBalance: true, pendingWithdrawal: true },
    }),
    prisma.withdrawalRequest.count({
      where: { userId, status: { in: ["PENDING", "APPROVED"] } },
    }),
  ]);
  const blockers: ClosureBlocker[] = [];
  if ((wallet?.availableBalance ?? 0) > 0) blockers.push("WALLET_BALANCE");
  if ((wallet?.pendingWithdrawal ?? 0) > 0 || openWithdrawals > 0)
    blockers.push("PENDING_WITHDRAWAL");
  return blockers;
}

const BLOCKER_TEXT: Record<ClosureBlocker, string> = {
  WALLET_BALANCE: "There is money in the wallet: withdraw it first.",
  PENDING_WITHDRAWAL:
    "A withdrawal is still being paid out: wait for it first.",
};

/** The address the closed account carries: valid-looking, unique, never deliverable (`.invalid` is reserved). */
const closedEmail = (id: string) => `closed-${id}@closed.invalid`;

export async function closeSurveyorAccount(
  userId: string,
  password: string
): Promise<{ closed: true }> {
  const user = await prisma.surfboardUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      isActive: true,
      passwordHash: true,
    },
  });
  if (!user || !user.isActive) throw new UnauthenticatedError();

  // Same cost whether or not there is a password to check (I-054); a Kinde-only account (no
  // password) cannot reach this route with a session of the app anyway.
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new ValidationError({ password: "Incorrect password" });
  }

  const blockers = await closureBlockers(userId);
  if (blockers.length > 0) {
    throw new ApiError(
      409,
      "ACCOUNT_CLOSURE_BLOCKED",
      blockers.map((b) => BLOCKER_TEXT[b]).join(" "),
      { reasons: blockers }
    );
  }

  // Stop the card being charged BEFORE anything is erased: if Paystack cannot be reached the
  // account stays open and the person can try again, instead of a closed account still paying.
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, cancelledAt: true, provider: true },
  });
  if (
    subscription &&
    subscription.status === "active" &&
    !subscription.cancelledAt &&
    subscription.provider !== "paystack_onetime"
  ) {
    try {
      await disableSubscription(userId);
    } catch {
      throw new ApiError(
        502,
        "SUBSCRIPTION_CANCEL_FAILED",
        "The subscription could not be cancelled, so the account is still open"
      );
    }
  }

  const oldEmail = user.email;
  const viewerFiles = await prisma.surfboardPlanViewerAttachment.findMany({
    where: { viewerId: userId },
    select: { url: true },
  });
  const platform = Platform.SURFBOARD;

  await prisma.$transaction(
    async (tx) => {
      // Plans other people own that were shared with this person: take the person off the list.
      const shared = await tx.surfboardPlan.findMany({
        where: { sharedTo: { has: userId } },
        select: { id: true, sharedTo: true },
      });
      for (const plan of shared) {
        await tx.surfboardPlan.update({
          where: { id: plan.id },
          data: {
            sharedTo: { set: plan.sharedTo.filter((id) => id !== userId) },
          },
        });
      }
      await tx.surfboardPlanShareResponse.deleteMany({
        where: { sharedWithUserId: userId },
      });
      await tx.surfboardPlanShareInvite.deleteMany({
        where: { email: { equals: oldEmail, mode: "insensitive" } },
      });
      await tx.surfboardPlanViewerAttachment.deleteMany({
        where: { viewerId: userId },
      });

      await tx.surveyorBankDetails.deleteMany({ where: { userId } });

      // Every way back in, and everything that holds the address.
      await tx.refreshToken.deleteMany({ where: { userId, platform } });
      await tx.deviceToken.deleteMany({ where: { userId, platform } });
      await tx.pushPreference.deleteMany({ where: { userId, platform } });
      await tx.passwordResetToken.deleteMany({ where: { userId, platform } });
      await tx.emailVerificationToken.deleteMany({
        where: { userId, platform },
      });
      await tx.emailVerificationOtp.deleteMany({ where: { userId, platform } });
      await tx.pendingRegistration.deleteMany({
        where: { platform, email: { equals: oldEmail, mode: "insensitive" } },
      });
      await tx.loginAttempt.deleteMany({
        where: {
          OR: [
            { userId },
            { identifier: { contains: oldEmail, mode: "insensitive" } },
          ],
        },
      });

      // The subscription is kept for the accounts, without the card token or the address.
      await tx.subscription.updateMany({
        where: { userId },
        data: { email: null, authorization: null, emailToken: null },
      });
      // The record that the person agreed stays; the address on it does not.
      await tx.legalConsent.updateMany({
        where: { platform, userId },
        data: { email: closedEmail(userId) },
      });

      await tx.surfboardUser.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: closedEmail(userId),
          firstName: "Deleted",
          lastName: "user",
          passwordHash: null,
          authProviders: [],
          kindeId: `closed:${crypto.randomUUID()}`,
          emailVerified: false,
          emailVerifiedVia: null,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          isKycValidated: false,
          logo: null,
          companyName: null,
          companyAddress: null,
          surconRegNumber: null,
          surconRegName: null,
          signature: null,
          prefix: null,
          suffix: null,
          residenceState: null,
          postalCode: null,
          phoneNumber: null,
          address: null,
          payerID: null,
          payerIDType: null,
          metadata: { closedAt: new Date().toISOString() },
        },
      });
    },
    { timeout: 20_000 }
  );

  // After the commit, and never able to undo it: an audit entry (no personal details), the
  // person's private files on others' plans, and a notice to the address that was closed.
  await logAuditAction({
    userId,
    action: "ACCOUNT_CLOSED",
    entity: "SurfboardUser",
    entityId: userId,
    changes: { by: "the person, in the app" },
  });
  if (viewerFiles.length > 0) {
    const result = await deleteMultipleSurfboardFilesFromS3WithUrl(viewerFiles);
    if (!result.success) {
      console.error(
        `Account ${userId} closed; ${viewerFiles.length} private file(s) could not be deleted:`,
        result.error
      );
    }
  }
  try {
    await sendAccountClosedNotice({
      to: oldEmail,
      firstName: user.firstName,
      platform,
    });
  } catch (err) {
    console.error("Account closed; the notice email failed:", err);
  }

  return { closed: true };
}
