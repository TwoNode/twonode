"use server";

// import { OneTimeUserPropertyModel } from "@/models/PaymentModel";
import { revalidatePath } from "next/cache";
import { uploadToS3FromServer } from "./awsActions";
import {
  initializePaystack,
  verifyPaystackTransaction,
} from "./paystackActions";
import {
  Prisma,
  NotificationAudience,
  NotificationType,
  Role,
} from "@/prisma/generated";
import { getAuthenticatedRevaUser } from "@/reva/utils/revaAuth";
import prisma from "@/lib/prisma";
import { sendEmailToAdmin } from "@/utils/email";
import { sendEmailToAllAdmins } from "@/app/(projects)/reva-restricted/actions/adminDbActions";

export type PropertyStatus = "Available" | "Completed" | "Processing";

export type PaymentStatus = "Paid" | "Unpaid";

export type PropertyCreateInputType = Omit<
  Prisma.PropertyCreateInput,
  "reference" | "status" | "paymentStatus"
> & {
  reference?: string;
  status?: PropertyStatus;
  paymentStatus?: PaymentStatus;
};

export type PropertyWithoutUser = Omit<
  Prisma.PropertyCreateInput,
  "user" | "status" | "paymentStatus"
> & {
  reference?: string;
  status?: PropertyStatus | string | null | undefined;
  paymentStatus?: PaymentStatus | string | null | undefined;
};

export type OneTimeUserPropertyCreateInputType = Omit<
  Prisma.OneTimeUserPropertyCreateInput,
  "reference" | "status" | "paymentStatus"
> & {
  reference?: string;
  status?: PropertyStatus;
  paymentStatus?: PaymentStatus;
};

function generateReference(): string {
  return `REVA_${globalThis?.crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 9)}`;
}

export const saveToOneTimeProperty = async (
  data: OneTimeUserPropertyCreateInputType
) => {
  try {
    data.paymentStatus = "Unpaid";
    data.status = "Processing";
    data.statusMessage = "Request is being processed";

    const newProperty = await prisma.oneTimeUserProperty.create({
      data: {
        ...data,
      } as any,
    });

    console.log("New property saved:", newProperty);
    // Trigger notification for new property request (includes email to all admins)
    await notifyNewPropertyRequest(newProperty as any, "oneTimeProperty");

    return {
      success: true,
      message: "Data saved successfully",
      data: newProperty,
    };
  } catch (error) {
    console.error("Error saving to database with Prisma:", error);
    return { success: false, message: "Failed to save data", error };
  }
};

export const saveToPropertyTable = async (data: PropertyCreateInputType) => {
  try {
    data.paymentStatus = "Unpaid";
    data.status = "Processing";
    data.statusMessage = "Request is being processed";

    if (!data.reference) {
      data.reference = generateReference();
    }

    const newProperty = await prisma.property.create({
      data: {
        ...data,
      } as any,
    });

    console.log("New property saved:", newProperty);

    // Get the user ID from the property's user relation
    const propertyWithUser = await prisma.property.findUnique({
      where: { id: newProperty.id },
      include: { user: true },
    });

    // Trigger notification for new property request
    await notifyNewPropertyRequest(newProperty, propertyWithUser?.user?.id);

    return {
      success: true,
      message: "Data saved successfully",
      data: newProperty,
    };
  } catch (error) {
    console.error("Error saving to database with Prisma:", error);
    return { success: false, message: "Failed to save data", error };
  }
};

export const updateOneTimeTransactionStatus = async (
  reference: string,
  status: PropertyStatus,
  paymentStatus: PaymentStatus,
  statusMessage: string,
  error: string | null
) => {
  try {
    const updatedTransaction = await prisma.oneTimeUserProperty.update({
      where: { reference },
      data: {
        status,
        paymentStatus,
        statusMessage,
        error,
      },
    });
    return updatedTransaction;
  } catch (error) {
    console.error("Error updating OneTime transaction status:", error);
    return null;
  }
};

export const updatePropertyTransactionStatus = async (
  reference: string,
  status: PropertyStatus,
  paymentStatus: PaymentStatus,
  statusMessage: string,
  error: string | null
) => {
  try {
    const updatedTransaction = await prisma.property.update({
      where: { reference },
      data: {
        status,
        paymentStatus,
        statusMessage,
        error,
      },
    });
    return updatedTransaction;
  } catch (error) {
    console.error("Error updating Property transaction status:", error);
    return null;
  }
};

export const saveFormDataAndInitiatePaystack = async (formData: FormData) => {
  try {
    const email = formData.get("email") as string;
    const requester = formData.get("requester") as string;
    const address = formData.get("address") as string;
    const location = JSON.parse(formData.get("location") as string);
    const lga = formData.get("lga") as string;
    const totalCost = parseFloat(formData.get("totalCost") as string);
    const comments = formData.get("comments") as string;
    const parcelId = formData.get("parcelId") as string;

    // const files = formData.getAll("files"); // Explicitly cast to File[]
    const files = formData
      .getAll("files")
      .filter((file) => file instanceof File) as File[];

    // for (let index = 0; index < files.length; index++) {
    //   const file = files[index];
    //   console.log(file instanceof File);
    // }

    let uploadedFilesUrls: string[] = [];

    if (files.length > 0) {
      uploadedFilesUrls = await uploadToS3FromServer(files);
    }

    // Handle site images
    const siteImages = formData
      .getAll("site_images")
      .filter((file) => file instanceof File) as File[];

    let uploadedSiteImagesUrls: string[] = [];

    if (siteImages.length > 0) {
      uploadedSiteImagesUrls = await uploadToS3FromServer(siteImages);
    }

    // throw new Error("error");

    // Upload files to AWS S3

    console.warn("FORM DATA UPLOADING", "\n\n\n\n\n\n");

    console.log("formData", formData);

    console.error("\n\n\n\n\n\n", "FORM DATA UPLOADED");

    if (files && files.length > 0) {
      uploadedFilesUrls = await uploadToS3FromServer(files);
    }

    // Determine if this is a live or test transaction based on environment
    const isLive = process.env.NODE_ENV === "production";

    const data = {
      email,
      requester,
      address,
      lat: location?.lat,
      lng: location?.lng,
      lga,
      totalCost,
      comments,
      parcelId,
      documentsUrls: uploadedFilesUrls,
      site_images: uploadedSiteImagesUrls,
      isLive,
    };

    const result = await saveToOneTimeProperty(data);

    console.log("Result from saveToDatabase:", result);

    if (!result.success) {
      return { error: "Failed to save data", status: 500 };
    }

    // Optionally, you can initiate Paystack payment here
    const paystackResponse: any = await initializePaystack({
      email,
      amount: totalCost * 100,
      reference: result?.data?.reference!,
      requester,
      address,
      lga,
      comments,
      isLive,
    });

    if (!paystackResponse || paystackResponse.status !== true) {
      // update the payment status in the database
      await updateOneTimeTransactionStatus(
        result?.data?.reference!,
        "Processing",
        "Unpaid",
        paystackResponse.message,
        null
      );

      return { error: `${paystackResponse.message}`, status: 500 };
    }

    // // update the payment status in the database
    // const updatedTransaction = await updateOneTimeTransactionStatus(
    //   result?.data?.reference!,
    //   "Processing",
    //   "Paid",
    //   paystackResponse.message,
    //   null
    // );

    console.log("Paystack response:", paystackResponse);

    revalidatePath("/reva/requestform");
    // Send the Paystack checkout URL to the frontend
    return {
      status: 200,
      success: paystackResponse.status,
      paystack: paystackResponse.data,
      data: { ...result.data }, // Ensure data is a plain object
    };

    // Optionally, you can revalidate a specific path or redirect after saving
  } catch (error) {
    console.error("Error in saveFormDataAndInitiatePaystack:", error);
    return { error, status: 500 };
  }
};

export const authSaveFormDataAndInitiatePaystack = async (
  formData: FormData
) => {
  try {
    const user = await getAuthenticatedRevaUser();

    if (!user) {
      return { error: "User is not authenticated.", status: 401 };
    }

    const email = user.email;
    const requester = user.firstName;

    const title = formData.get("title") as string;
    const address = formData.get("address") as string;
    const location = JSON.parse(formData.get("location") as string);
    const lga = formData.get("lga") as string;
    const totalCost = parseFloat(formData.get("totalCost") as string);
    const comments = formData.get("comments") as string;
    const parcelId = formData.get("parcelId") as string;

    // const files = formData.getAll("files"); // Explicitly cast to File[]
    const files = formData
      .getAll("files")
      .filter((file) => file instanceof File) as File[];

    // for (let index = 0; index < files.length; index++) {
    //   const file = files[index];
    //   console.log(file instanceof File);
    // }

    let uploadedFilesUrls: string[] = [];

    if (files.length > 0) {
      uploadedFilesUrls = await uploadToS3FromServer(files);
    }

    // Handle site images
    const siteImages = formData
      .getAll("site_images")
      .filter((file) => file instanceof File) as File[];

    let uploadedSiteImagesUrls: string[] = [];

    if (siteImages.length > 0) {
      uploadedSiteImagesUrls = await uploadToS3FromServer(siteImages);
    }

    if (files && files.length > 0) {
      uploadedFilesUrls = await uploadToS3FromServer(files);
    }

    // Determine if this is a live or test transaction based on environment
    const isLive = process.env.NODE_ENV === "production";

    const data = {
      user: { connect: { id: user.id } }, // Assuming `email` is the unique identifier for the user
      title,
      address,
      lat: location?.lat,
      lng: location?.lng,
      lga,
      totalCost,
      comments,
      parcelId,
      documentsUrls: uploadedFilesUrls,
      site_images: uploadedSiteImagesUrls,
      isLive,
    };

    const result: any = await saveToPropertyTable(data);

    console.log("Result from saveToDatabase:", result);

    if (!result.success) {
      return { error: "Failed to save data", status: 500 };
    }

    // Optionally, you can initiate Paystack payment here
    const paystackResponse: any = await initializePaystack({
      email,
      amount: totalCost * 100,
      reference: result?.data?.reference!,
      requester,
      address,
      lga,
      comments,
      isAuthenticated: true,
      isLive,
    });

    if (!paystackResponse || paystackResponse.status !== true) {
      // update the payment status in the database
      await updatePropertyTransactionStatus(
        result?.data?.reference!,
        "Processing",
        "Unpaid",
        paystackResponse.message,
        null
      );

      return { error: `${paystackResponse.message}`, status: 500 };
    }

    // // update the payment status in the database
    // const updatedTransaction = await updatePropertyTransactionStatus(
    //   result?.data?.reference!,
    //   "Processing",
    //   "Paid",
    //   paystackResponse.message,
    //   null
    // );

    console.log("Paystack response:", paystackResponse);

    revalidatePath("/reva/dashboard/newrequest");
    // Send the Paystack checkout URL to the frontend
    return {
      status: 200,
      success: paystackResponse.status,
      paystack: paystackResponse.data,
      data: { ...result.data }, // Ensure data is a plain object
    };

    // Optionally, you can revalidate a specific path or redirect after saving
  } catch (error) {
    console.error("Error in saveFormDataAndInitiatePaystack:", error);
    return { error, status: 500 };
  }
};

export const checkPaymentSuccess = async (reference: string) => {
  try {
    // Fetch existing transaction from the database
    const existingTransaction = await prisma.oneTimeUserProperty.findUnique({
      where: { reference },
    });

    // If transaction does not exist, return an error
    if (!existingTransaction) {
      console.error("Transaction not found:", reference);
      return { success: false, message: "Transaction not found." };
    }

    // If payment is already marked as successful, avoid duplicate updates
    if (existingTransaction.paymentStatus === "Paid") {
      console.log("Transaction already marked as successful:", reference);

      return {
        success: true,
        message: "Payment has already been recorded.",
        data: existingTransaction,
      };
    }

    // Verify the transaction with Paystack using the appropriate environment
    const verificationResponse = await verifyPaystackTransaction(
      reference,
      existingTransaction.isLive
    );

    // Check if the transaction was actually successful
    if (!verificationResponse || !verificationResponse.status) {
      console.error("Transaction verification failed:", verificationResponse);

      return {
        success: false,
        message: "Transaction verification failed or was unsuccessful.",
        error: verificationResponse,
      };
    }

    // Update the transaction status in the database
    const updatedTransaction = await prisma.oneTimeUserProperty.update({
      where: { reference },
      data: {
        status: "Processing",
        paymentStatus: "Paid",
        statusMessage: "Payment completed successfully",
        error: null,
      },
    });

    console.log("Payment marked as successful:", updatedTransaction);

    // Trigger notification for payment received
    await notifyPaymentReceived(updatedTransaction);

    // Send email to client after payment
    if (updatedTransaction.email) {
      try {
        await sendEmailToAdmin({
          to: updatedTransaction.email,
          subject: "REVA: Payment Received for Your OneTime Request",
          text: `Hello,\n\nYour payment for reference ${updatedTransaction.reference} has been received. Your request is now being processed.`,
          html: `<p>Hello,</p><p>Your payment for reference <b>${updatedTransaction.reference}</b> has been received. Your request is now being processed.</p><p>Thank you for using REVA.</p>`,
        });
      } catch (err) {
        console.error(
          "Failed to send payment confirmation email to client:",
          err
        );
      }
    }

    return {
      success: true,
      message: "Payment recorded successfully",
      data: updatedTransaction,
    };
  } catch (error) {
    console.error("Error processing payment:", error);
    return { success: false, message: "Failed to process payment", error };
  }
};

export const authPaymentSuccessful = async (reference: string) => {
  try {
    // Fetch authenticated user
    const user = await getAuthenticatedRevaUser();
    if (!user) {
      return { success: false, message: "User is not authenticated." };
    }

    // // Fetch existing transaction from the database
    // const existingTransaction = await prisma.property.findUnique({
    //   where: { reference, userId: user.id },
    // });

    const existingTransaction = await prisma.property.findFirst({
      where: {
        userId: user.id,
        OR: [
          { reference: reference },
          { references: { has: reference } }, // Match inside array
        ],
      },
    });

    // If transaction does not exist, return an error
    if (!existingTransaction) {
      console.error("Transaction not found:", reference);
      return { success: false, message: "Transaction not found." };
    }

    // If payment is already marked as successful, avoid duplicate updates
    if (existingTransaction.paymentStatus === "Paid") {
      console.log("Transaction already marked as successful:", reference);

      return {
        success: true,
        message: "Payment has already been recorded.",
        data: { ...user, ...existingTransaction },
      };
    }

    // Verify the transaction with Paystack using the appropriate environment
    const verificationResponse = await verifyPaystackTransaction(
      reference,
      existingTransaction.isLive
    );

    // Check if the transaction was actually successful
    if (!verificationResponse || !verificationResponse.status) {
      console.error("Transaction verification failed:", verificationResponse);

      return {
        success: false,
        message: "Transaction verification failed or was unsuccessful.",
        error: verificationResponse,
      };
    }

    // Update the transaction status in the database
    const updatedTransaction = await prisma.property.update({
      where: { reference },
      data: {
        status: "Processing",
        paymentStatus: "Paid",
        statusMessage: "Payment completed successfully",
        error: null,
      },
    });

    console.log("Payment marked as successful:", updatedTransaction);

    // Trigger notification for payment received
    await notifyPaymentReceived(updatedTransaction, user.id);

    // Send email to client after payment
    if (user?.email) {
      try {
        await sendEmailToAdmin({
          to: user.email,
          subject: "REVA: Payment Received for Your Request",
          text: `Hello,\n\nYour payment for reference ${updatedTransaction.reference} has been received. Your request is now being processed.`,
          html: `<p>Hello,</p><p>Your payment for reference <b>${updatedTransaction.reference}</b> has been received. Your request is now being processed.</p><p>Thank you for using REVA.</p>`,
        });
      } catch (err) {
        console.error(
          "Failed to send payment confirmation email to client:",
          err
        );
      }
    }

    return {
      success: true,
      message: "Payment recorded successfully",
      data: { ...user, ...updatedTransaction },
    };
  } catch (error) {
    console.error("Error processing payment:", error);
    return { success: false, message: "Failed to process payment", error };
  }
};

export const getTransactionData = async (reference: string) => {
  try {
    const transaction = await prisma.oneTimeUserProperty.findUnique({
      where: { reference },
    });

    if (!transaction) {
      return { success: false, message: "Transaction not found." };
    }

    return { success: true, data: transaction };
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    return {
      success: false,
      message: "Failed to fetch transaction data",
      error,
    };
  }
};

export const authGetTransactionData = async (reference: string) => {
  try {
    const transaction = await prisma.property.findUnique({
      where: { reference },
    });

    if (!transaction) {
      return { success: false, message: "Transaction not found." };
    }

    return { success: true, data: transaction };
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    return {
      success: false,
      message: "Failed to fetch transaction data",
      error,
    };
  }
};

const getAllUserProperties = async (userId: string) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        user: {
          kindeId: userId,
        },
        deleted: false,
      },
    });

    return properties;
  } catch (error) {
    console.error("Error fetching user properties:", error);
    return [];
  }
};

export const getUserProperties = async () => {
  try {
    const user = await getAuthenticatedRevaUser();

    if (!user) {
      return { success: false, message: "User is not authenticated." };
    }

    const properties = await getAllUserProperties(user?.kindeId!);

    if (!properties || properties.length === 0) {
      return { success: true, message: "No properties found for this user." };
    }

    return {
      success: true,
      data: properties?.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA; // Sort descending by date
      }),
    };
  } catch (error) {
    console.error("Error fetching user properties:", error);
    return {
      success: false,
      message: "Failed to fetch user properties",
      error,
    };
  }
};

export const getUserPropertyById = async (id: string) => {
  try {
    const property = await prisma.oneTimeUserProperty.findUnique({
      where: { id },
    });

    if (!property) {
      return { success: false, message: "Property not found." };
    }

    return { success: true, data: property };
  } catch (error) {
    console.error("Error fetching user property:", error);
    return { success: false, message: "Failed to fetch user property", error };
  }
};

// ===== NOTIFICATION FUNCTIONS =====

// Enhanced Notification Service

export type NotificationCreateInput = {
  type: NotificationType;
  title: string;
  message: string;
  userIds?: string[];
  audience?: NotificationAudience;
  link?: string;
  metadata?: any;
};

export const createNotification = async (data: NotificationCreateInput) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        userIds: data.userIds || [],
        audience: data.audience || NotificationAudience.SPECIFIC_USERS,
        link: data.link,
        metadata: data.metadata,
      },
    });
    return {
      success: true,
      message: "Notification created successfully",
      data: notification,
    };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, message: "Failed to create notification", error };
  }
};

export const getUserNotifications = async (userId: string, role: Role) => {
  try {
    const conditions: any[] = [
      // User-specific notifications (always visible to the target user)
      { userIds: { has: userId } },
    ];

    // Add role-based audience conditions
    if (role === Role.SUPERADMIN) {
      conditions.push(
        { audience: NotificationAudience.SUPERADMIN },
        { audience: NotificationAudience.GENERAL_ADMINS },
        { audience: NotificationAudience.ALL_USERS }
      );
    } else if (role === Role.ADMIN) {
      conditions.push(
        { audience: NotificationAudience.GENERAL_ADMINS },
        { audience: NotificationAudience.ALL_USERS }
      );
    }
    // For USER role, do NOT push GENERAL_USERS notifications
    // else if (role === Role.USER) {
    //   conditions.push(
    //     { audience: NotificationAudience.GENERAL_USERS },
    //     { audience: NotificationAudience.ALL_USERS }
    //   );
    // }

    const notifications = await prisma.notification.findMany({
      where: { OR: conditions },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: notifications };
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return { success: false, message: "Failed to fetch notifications", error };
  }
};

export const getAdminNotifications = async () => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { audience: NotificationAudience.GENERAL_ADMINS },
          { audience: NotificationAudience.ALL_USERS },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: notifications };
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return { success: false, message: "Failed to fetch notifications", error };
  }
};

export const getSuperAdminNotifications = async () => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { audience: NotificationAudience.SUPERADMIN },
          { audience: NotificationAudience.GENERAL_ADMINS },
          { audience: NotificationAudience.ALL_USERS },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: notifications };
  } catch (error) {
    console.error("Error fetching superadmin notifications:", error);
    return { success: false, message: "Failed to fetch notifications", error };
  }
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification)
      return { success: false, message: "Notification not found" };

    const updatedReadBy = notification.readBy.includes(userId)
      ? notification.readBy
      : [...notification.readBy, userId];

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readBy: updatedReadBy },
    });

    return {
      success: true,
      message: "Notification marked as read",
      data: updated,
    };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return {
      success: false,
      message: "Failed to mark notification as read",
      error,
    };
  }
};

export const dismissNotification = async (
  notificationId: string,
  userId: string
) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification)
      return { success: false, message: "Notification not found" };

    const updatedDismissedBy = notification.dismissedBy.includes(userId)
      ? notification.dismissedBy
      : [...notification.dismissedBy, userId];

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { dismissedBy: updatedDismissedBy },
    });

    return { success: true, message: "Notification dismissed", data: updated };
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return { success: false, message: "Failed to dismiss notification", error };
  }
};

export const getUnreadNotificationCount = async (
  userId: string,
  role: Role
) => {
  try {
    const base = await getUserNotifications(userId, role);
    if (!base.success) throw base.error;

    const unread =
      base.data?.filter(
        (n) => !n.readBy.includes(userId) && !n.dismissedBy.includes(userId)
      ) ?? [];

    return { success: true, count: unread.length };
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return { success: false, count: 0, error };
  }
};

// ===== NOTIFICATION TRIGGERS =====

export const notifyNewPropertyRequest = async (
  propertyData: any,
  userId?: string
) => {
  try {
    // Determine if this is a OneTime request and get the requester name
    const isOneTimeRequest = !!propertyData?.requester;
    let requesterName =
      propertyData?.requester || propertyData?.email || "Unknown";

    // For regular authenticated requests, try to get user info if not already included
    if (!isOneTimeRequest && propertyData?.userId) {
      try {
        const user = await prisma.revaUser.findUnique({
          where: { id: propertyData.userId },
          select: { firstName: true, lastName: true, email: true },
        });
        if (user) {
          requesterName =
            `${user.firstName} ${user.lastName}`.trim() || user.email;
        }
      } catch (userError) {
        console.error("Error fetching user info for email:", userError);
        // Fallback to email if user fetch fails
        requesterName = propertyData?.email || "Unknown";
      }
    }

    // Notify admins about new property request
    await createNotification({
      type: "PROPERTY",
      title: `New ${isOneTimeRequest ? "OneTime " : ""} Property Request`,
      message: `New due diligence request received for ${propertyData.address}`,
      link: `/reva-restricted/dashboard/viewdetails?reference=${propertyData.reference}`,
      audience: NotificationAudience.GENERAL_ADMINS,
      metadata: {
        propertyReference: propertyData.reference,
        address: propertyData.address,
        requester: requesterName,
        oneTimeRequest: isOneTimeRequest,
      },
    });

    // Notify user if userId provided
    if (userId) {
      await createNotification({
        type: "SUCCESS",
        title: "Request Submitted Successfully",
        message: `Your due diligence request for ${propertyData.address} has been submitted and is being processed.`,
        userIds: [userId],
        link: `/reva/dashboard/viewdetails?reference=${propertyData.reference}`,
        metadata: {
          propertyReference: propertyData.reference,
          address: propertyData.address,
          oneTimeRequest: isOneTimeRequest,
        },
      });
    }

    // Send email to all admin users in the database
    try {
      await sendEmailToAllAdmins({
        subject: `New ${isOneTimeRequest ? "OneTime " : ""} Property Request`,
        text: `New due diligence request received for ${propertyData.address}`,
        html: `
          <h3>New ${isOneTimeRequest ? "OneTime " : ""} Property Request</h3>
          <p>A new due diligence request has been received:</p>
          <ul>
            <li>Property: ${propertyData.address}</li>
            <li>Reference: ${propertyData.reference}</li>
            <li>Requester: ${requesterName}</li>
          </ul>
          <p>Please review this request in the admin dashboard.</p>
        `,
      });
    } catch (emailError) {
      console.error("Error sending emails to admins:", emailError);
      // Fallback to single admin email if bulk email fails
      if (process.env.ADMIN_EMAIL) {
        await sendEmailToAdmin({
          to: process.env.ADMIN_EMAIL,
          subject: `New ${isOneTimeRequest ? "OneTime " : ""} Property Request`,
          text: `New due diligence request received for ${propertyData.address}`,
          html: `
            <h3>New ${isOneTimeRequest ? "OneTime " : ""} Property Request</h3>
            <p>A new due diligence request has been received:</p>
            <ul>
              <li>Property: ${propertyData.address}</li>
              <li>Reference: ${propertyData.reference}</li>
              <li>Requester: ${requesterName}</li>
            </ul>
          `,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating property request notifications:", error);
    return { success: false, error };
  }
};

export const notifyPaymentReceived = async (
  propertyData: any,
  userId?: string
) => {
  try {
    await createNotification({
      type: "PAYMENT",
      title: "Payment Received",
      message: `Payment of ₦${propertyData.totalCost?.toLocaleString()} received for property ${propertyData.reference
        }`,
      link: `/reva-restricted/dashboard/viewdetails?reference=${propertyData.reference}`,
      audience: NotificationAudience.GENERAL_ADMINS,
      metadata: {
        propertyReference: propertyData.reference,
        amount: propertyData.totalCost,
        address: propertyData.address,
      },
    });

    if (userId) {
      await createNotification({
        type: "SUCCESS",
        title: "Payment Confirmed",
        message: `Your payment of ₦${propertyData.totalCost?.toLocaleString()} for property ${propertyData.reference
          } has been confirmed.`,
        userIds: [userId],
        link: `/reva/dashboard/viewdetails?reference=${propertyData.reference}`,
        metadata: {
          propertyReference: propertyData.reference,
          amount: propertyData.totalCost,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error creating payment notifications:", error);
    return { success: false, error };
  }
};

export const notifyReportReady = async (propertyData: any, userId?: string) => {
  try {
    // Check if this is a OneTime request
    const isOneTimeRequest = !!propertyData?.requester;

    if (userId && !isOneTimeRequest) {
      // Regular user notification
      await createNotification({
        type: "SUCCESS",
        title: "Report Ready",
        message: `Your due diligence report for property ${propertyData.reference} is now available.`,
        userIds: [userId],
        link: `/reva/dashboard/viewdetails?reference=${propertyData.reference}`,
        metadata: {
          propertyReference: propertyData.reference,
          address: propertyData.address,
          oneTimeRequest: false,
        },
      });
    } else if (isOneTimeRequest && propertyData?.email) {
      // OneTime request notification - create a system notification that can be accessed via email
      // await createNotification({
      //   type: "SUCCESS",
      //   title: "OneTime Report Ready",
      //   message: `Your OneTime due diligence report for property ${propertyData.reference} is now available.`,
      //   audience: NotificationAudience.SPECIFIC_USERS, // This will be accessible to anyone with the link
      //   link: `/reva/onetimerequest?reference=${
      //     propertyData.reference
      //   }&email=${encodeURIComponent(propertyData.email)}`,
      //   metadata: {
      //     propertyReference: propertyData.reference,
      //     address: propertyData.address,
      //     oneTimeRequest: true,
      //     email: propertyData.email,
      //   },
      //   userIds: [propertyData.email],
      // });
    }
    return { success: true };
  } catch (error) {
    console.error("Error creating report ready notification:", error);
    return { success: false, error };
  }
};

export const notifySystemAlert = async (
  title: string,
  message: string,
  userIds?: string[]
) => {
  try {
    await createNotification({
      type: "SYSTEM",
      title,
      message,
      userIds,
      audience: userIds?.length
        ? NotificationAudience.SPECIFIC_USERS
        : NotificationAudience.ALL_USERS,
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating system alert:", error);
    return { success: false, error };
  }
};

// ===== NOTIFICATION ACCESS CONTROL TEST =====

export const testNotificationAccessControl = async () => {
  try {
    console.log("🧪 Testing Notification Access Control...");

    // Create test notifications for different audiences
    const testNotifications = [
      {
        type: "INFO" as NotificationType,
        title: "User Test Notification",
        message: "This should only be visible to users",
        audience: NotificationAudience.GENERAL_USERS,
      },
      {
        type: "INFO" as NotificationType,
        title: "Admin Test Notification",
        message: "This should only be visible to admins",
        audience: NotificationAudience.GENERAL_ADMINS,
      },
      {
        type: "INFO" as NotificationType,
        title: "Superadmin Test Notification",
        message: "This should only be visible to superadmins",
        audience: NotificationAudience.SUPERADMIN,
      },
      {
        type: "INFO" as NotificationType,
        title: "All Users Test Notification",
        message: "This should be visible to everyone",
        audience: NotificationAudience.ALL_USERS,
      },
      {
        type: "INFO" as NotificationType,
        title: "Specific User Test Notification",
        message: "This should only be visible to specific user",
        userIds: ["test-user-id"],
        audience: NotificationAudience.SPECIFIC_USERS,
      },
    ];

    // Create the test notifications
    for (const notif of testNotifications) {
      await createNotification(notif);
    }

    console.log("✅ Test notifications created successfully");

    // Test access control for each role
    const testResults = {
      user: {
        generalUsers: 0,
        generalAdmins: 0,
        superadmin: 0,
        allUsers: 0,
        specificUsers: 0,
      },
      admin: {
        generalUsers: 0,
        generalAdmins: 0,
        superadmin: 0,
        allUsers: 0,
        specificUsers: 0,
      },
      superadmin: {
        generalUsers: 0,
        generalAdmins: 0,
        superadmin: 0,
        allUsers: 0,
        specificUsers: 0,
      },
    };

    // Test USER role access
    const userNotifs = await getUserNotifications("test-user-id", Role.USER);
    if (userNotifs.success) {
      userNotifs.data?.forEach((notif) => {
        if (notif.audience === NotificationAudience.GENERAL_USERS)
          testResults.user.generalUsers++;
        if (notif.audience === NotificationAudience.GENERAL_ADMINS)
          testResults.user.generalAdmins++;
        if (notif.audience === NotificationAudience.SUPERADMIN)
          testResults.user.superadmin++;
        if (notif.audience === NotificationAudience.ALL_USERS)
          testResults.user.allUsers++;
        if (notif.audience === NotificationAudience.SPECIFIC_USERS)
          testResults.user.specificUsers++;
      });
    }

    // Test ADMIN role access
    const adminNotifs = await getUserNotifications("test-admin-id", Role.ADMIN);
    if (adminNotifs.success) {
      adminNotifs.data?.forEach((notif) => {
        if (notif.audience === NotificationAudience.GENERAL_USERS)
          testResults.admin.generalUsers++;
        if (notif.audience === NotificationAudience.GENERAL_ADMINS)
          testResults.admin.generalAdmins++;
        if (notif.audience === NotificationAudience.SUPERADMIN)
          testResults.admin.superadmin++;
        if (notif.audience === NotificationAudience.ALL_USERS)
          testResults.admin.allUsers++;
        if (notif.audience === NotificationAudience.SPECIFIC_USERS)
          testResults.admin.specificUsers++;
      });
    }

    // Test SUPERADMIN role access
    const superadminNotifs = await getUserNotifications(
      "test-superadmin-id",
      Role.SUPERADMIN
    );
    if (superadminNotifs.success) {
      superadminNotifs.data?.forEach((notif) => {
        if (notif.audience === NotificationAudience.GENERAL_USERS)
          testResults.superadmin.generalUsers++;
        if (notif.audience === NotificationAudience.GENERAL_ADMINS)
          testResults.superadmin.generalAdmins++;
        if (notif.audience === NotificationAudience.SUPERADMIN)
          testResults.superadmin.superadmin++;
        if (notif.audience === NotificationAudience.ALL_USERS)
          testResults.superadmin.allUsers++;
        if (notif.audience === NotificationAudience.SPECIFIC_USERS)
          testResults.superadmin.specificUsers++;
      });
    }

    console.log("📊 Test Results:", testResults);

    // Verify access control is working correctly
    const accessControlPassed =
      // Users should NOT see admin or superadmin notifications
      testResults.user.generalAdmins === 0 &&
      testResults.user.superadmin === 0 &&
      // Users should see user and all users notifications
      testResults.user.generalUsers > 0 &&
      testResults.user.allUsers > 0 &&
      // Admins should NOT see user or superadmin notifications
      testResults.admin.generalUsers === 0 &&
      testResults.admin.superadmin === 0 &&
      // Admins should see admin and all users notifications
      testResults.admin.generalAdmins > 0 &&
      testResults.admin.allUsers > 0 &&
      // Superadmins should NOT see user or admin notifications
      testResults.superadmin.generalUsers === 0 &&
      testResults.superadmin.generalAdmins === 0 &&
      // Superadmins should see superadmin and all users notifications
      testResults.superadmin.superadmin > 0 &&
      testResults.superadmin.allUsers > 0;

    if (accessControlPassed) {
      console.log("✅ Notification Access Control Test PASSED");
    } else {
      console.log("❌ Notification Access Control Test FAILED");
    }

    return {
      success: accessControlPassed,
      results: testResults,
      message: accessControlPassed
        ? "Access control working correctly"
        : "Access control has issues",
    };
  } catch (error) {
    console.error("Error testing notification access control:", error);
    return { success: false, error: "Test failed" };
  }
};

// ===== NOTIFICATION CREATION TEST =====

export const testNotificationCreation = async () => {
  try {
    console.log("🧪 Testing Notification Creation...");

    // Test creating a notification for each audience
    const testNotifications = [
      {
        type: "INFO" as NotificationType,
        title: "Test User Notification",
        message: "This is a test notification for users",
        audience: NotificationAudience.GENERAL_USERS,
      },
      {
        type: "WARNING" as NotificationType,
        title: "Test Admin Notification",
        message: "This is a test notification for admins",
        audience: NotificationAudience.GENERAL_ADMINS,
      },
      {
        type: "SUCCESS" as NotificationType,
        title: "Test Superadmin Notification",
        message: "This is a test notification for superadmins",
        audience: NotificationAudience.SUPERADMIN,
      },
      {
        type: "SYSTEM" as NotificationType,
        title: "Test All Users Notification",
        message: "This is a test notification for all users",
        audience: NotificationAudience.ALL_USERS,
      },
    ];

    const results = [];

    for (const notif of testNotifications) {
      const result = await createNotification(notif);
      results.push({
        notification: notif,
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        console.log(
          `✅ Created ${notif.audience} notification: ${notif.title}`
        );
      } else {
        console.log(
          `❌ Failed to create ${notif.audience} notification: ${result.message}`
        );
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    console.log(
      `📊 Notification Creation Test Results: ${successCount}/${totalCount} successful`
    );

    return {
      success: successCount === totalCount,
      results,
      message:
        successCount === totalCount
          ? "All notifications created successfully"
          : `${successCount}/${totalCount} notifications created successfully`,
    };
  } catch (error) {
    console.error("Error testing notification creation:", error);
    return { success: false, error: "Test failed" };
  }
};

export const getOneTimeRequestByReference = async (
  reference: string,
  email: string
) => {
  try {
    const request = await prisma.oneTimeUserProperty.findFirst({
      where: {
        reference,
        email,
      },
    });

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    return { success: true, data: request };
  } catch (error) {
    console.error("Error fetching OneTime request:", error);
    return { success: false, error: "Failed to fetch request" };
  }
};

export const downloadOneTimeRequestReport = async (
  reference: string,
  email: string
) => {
  try {
    if (!reference || !email) {
      return {
        success: false,
        error: "Reference and email are required",
        status: 400,
      };
    }

    const result = await getOneTimeRequestByReference(reference, email);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: "Request not found or unauthorized",
        status: 404,
      };
    }

    const request = result.data;

    // Check if report exists and is approved
    if (!request.report || typeof request.report !== "object") {
      return {
        success: false,
        error: "Report not found",
        status: 404,
      };
    }

    if (
      !request.report ||
      typeof request.report !== "object" ||
      !("isApproved" in request.report) ||
      !request.report?.isApproved
    ) {
      return {
        success: false,
        error: "Report is not yet approved",
        status: 403,
      };
    }

    // If there's a direct file link, return it for redirection
    if (
      typeof request.report === "object" &&
      "directFileLink" in request.report
    ) {
      return {
        success: true,
        data: {
          redirectUrl: request.report.directFileLink as string,
          type: "redirect",
        },
      };
    }

    // Return the report data
    return {
      success: true,
      data: {
        reference: request.reference,
        address: request.address,
        report: request.report,
        approvedAt: (request.report as any).approvedAt ?? null,
        approvedBy: (request.report as any).approvedBy ?? null,
        type: "data",
      },
    };
  } catch (error) {
    console.error("Error downloading OneTime report:", error);
    return {
      success: false,
      error: "Internal server error",
      status: 500,
    };
  }
};
