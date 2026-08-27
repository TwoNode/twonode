import prisma from "@/lib/prisma";
import { ValidationError, ConflictError, NotFoundError } from "@/lib/api/errors";
import { uploadToS3FromServer } from "@/app/(projects)/reva/actions/awsActions";
import { initializePaystack, verifyPaystackTransaction } from "@/app/(projects)/reva/actions/paystackActions";
import { sendEmailToAdmin } from "@/utils/email";
import {
  saveToOneTimeProperty,
  saveToPropertyTable,
  updateOneTimeTransactionStatus,
  updatePropertyTransactionStatus,
} from "@/reva/services/propertyRequestService";
import { notifyPaymentReceived } from "@/reva/services/notificationService";

/**
 * Migrated from revaActions.ts's Paystack-integrated submission/verification
 * functions. Depends on propertyRequestService.ts for the underlying
 * create/update calls and notificationService.ts for the payment-received
 * trigger — awsActions.ts/paystackActions.ts stay "use server" utility
 * files, called from here the same way Surfboard's services call
 * awsActions.ts/notificationActions.ts.
 */

async function uploadFormFiles(formData: FormData, field: string): Promise<string[]> {
  const files = formData.getAll(field).filter((f) => f instanceof File) as File[];
  return files.length > 0 ? uploadToS3FromServer(files) : [];
}

export async function saveFormDataAndInitiatePaystack(formData: FormData) {
  const email = formData.get("email") as string;
  const requester = formData.get("requester") as string;
  const address = formData.get("address") as string;
  const location = JSON.parse(formData.get("location") as string);
  const lga = formData.get("lga") as string;
  const totalCost = parseFloat(formData.get("totalCost") as string);
  const comments = formData.get("comments") as string;
  const parcelId = formData.get("parcelId") as string;

  const documentsUrls = await uploadFormFiles(formData, "files");
  const siteImages = await uploadFormFiles(formData, "site_images");

  const isLive = process.env.NODE_ENV === "production";

  const property = await saveToOneTimeProperty({
    email,
    requester,
    address,
    lat: location?.lat,
    lng: location?.lng,
    lga,
    totalCost,
    comments,
    parcelId,
    documentsUrls,
    site_images: siteImages,
    isLive,
  } as any);

  const paystackResponse: any = await initializePaystack({
    email,
    amount: totalCost * 100,
    reference: property.reference,
    requester,
    address,
    lga,
    comments,
    isLive,
  });

  if (!paystackResponse || paystackResponse.status !== true) {
    await updateOneTimeTransactionStatus(property.reference, "Processing", "Unpaid", paystackResponse?.message, null);
    throw new ValidationError({ paystack: paystackResponse?.message ?? "Failed to initialize payment" });
  }

  return { paystack: paystackResponse.data, property };
}

export async function authSaveFormDataAndInitiatePaystack(
  formData: FormData,
  user: { id: string; email: string; firstName: string }
) {
  const title = formData.get("title") as string;
  const address = formData.get("address") as string;
  const location = JSON.parse(formData.get("location") as string);
  const lga = formData.get("lga") as string;
  const totalCost = parseFloat(formData.get("totalCost") as string);
  const comments = formData.get("comments") as string;
  const parcelId = formData.get("parcelId") as string;

  const documentsUrls = await uploadFormFiles(formData, "files");
  const siteImages = await uploadFormFiles(formData, "site_images");

  const isLive = process.env.NODE_ENV === "production";

  const property = await saveToPropertyTable({
    user: { connect: { id: user.id } },
    title,
    address,
    lat: location?.lat,
    lng: location?.lng,
    lga,
    totalCost,
    comments,
    parcelId,
    documentsUrls,
    site_images: siteImages,
    isLive,
  } as any);

  const paystackResponse: any = await initializePaystack({
    email: user.email,
    amount: totalCost * 100,
    reference: property.reference,
    requester: user.firstName,
    address,
    lga,
    comments,
    isAuthenticated: true,
    isLive,
  });

  if (!paystackResponse || paystackResponse.status !== true) {
    await updatePropertyTransactionStatus(property.reference, "Processing", "Unpaid", paystackResponse?.message, null);
    throw new ValidationError({ paystack: paystackResponse?.message ?? "Failed to initialize payment" });
  }

  return { paystack: paystackResponse.data, property };
}

export async function checkPaymentSuccess(reference: string) {
  const existing = await prisma.oneTimeUserProperty.findUnique({ where: { reference } });
  if (!existing) throw new NotFoundError("Transaction");

  if (existing.paymentStatus === "Paid") {
    return existing;
  }

  const verification: any = await verifyPaystackTransaction(reference, existing.isLive);
  if (!verification?.status) {
    throw new ConflictError("Transaction verification failed or was unsuccessful");
  }

  const updated = await prisma.oneTimeUserProperty.update({
    where: { reference },
    data: { status: "Processing", paymentStatus: "Paid", statusMessage: "Payment completed successfully", error: null },
  });

  await notifyPaymentReceived(updated);

  if (updated.email) {
    try {
      await sendEmailToAdmin({
        to: updated.email,
        subject: "REVA: Payment Received for Your OneTime Request",
        text: `Hello,\n\nYour payment for reference ${updated.reference} has been received. Your request is now being processed.`,
        html: `<p>Hello,</p><p>Your payment for reference <b>${updated.reference}</b> has been received. Your request is now being processed.</p><p>Thank you for using REVA.</p>`,
      });
    } catch (err) {
      console.error("Failed to send payment confirmation email to client:", err);
    }
  }

  return updated;
}

export async function authPaymentSuccessful(reference: string, userId: string, userEmail: string) {
  const existing = await prisma.property.findFirst({
    where: { userId, OR: [{ reference }, { references: { has: reference } }] },
  });
  if (!existing) throw new NotFoundError("Transaction");

  if (existing.paymentStatus === "Paid") {
    return existing;
  }

  const verification: any = await verifyPaystackTransaction(reference, existing.isLive);
  if (!verification?.status) {
    throw new ConflictError("Transaction verification failed or was unsuccessful");
  }

  const updated = await prisma.property.update({
    where: { reference },
    data: { status: "Processing", paymentStatus: "Paid", statusMessage: "Payment completed successfully", error: null },
  });

  await notifyPaymentReceived(updated, userId);

  try {
    await sendEmailToAdmin({
      to: userEmail,
      subject: "REVA: Payment Received for Your Request",
      text: `Hello,\n\nYour payment for reference ${updated.reference} has been received. Your request is now being processed.`,
      html: `<p>Hello,</p><p>Your payment for reference <b>${updated.reference}</b> has been received. Your request is now being processed.</p><p>Thank you for using REVA.</p>`,
    });
  } catch (err) {
    console.error("Failed to send payment confirmation email to client:", err);
  }

  return updated;
}
