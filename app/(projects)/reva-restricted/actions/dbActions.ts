"use server";

// import { OneTimeUserPropertyModel } from "@/models/PaymentModel";
import { revalidatePath } from "next/cache";
import { uploadToS3FromServer } from "./awsActions";
import {
  initializePaystack,
  verifyPaystackTransaction,
} from "./paystackActions";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/utils/authUser";
import prisma from "@/lib/prisma";

export type PropertyCreateInputType = Omit<
  Prisma.PropertyCreateInput,
  "reference"
> & {
  reference?: string;
};

export type OneTimeUserPropertyCreateInputType = Omit<
  Prisma.OneTimeUserPropertyCreateInput,
  "reference"
> & {
  reference?: string;
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
    data.paymentStatus = "Pending";
    data.status = "Pending";
    data.statusMessage = "Request is being processed";

    const newProperty = await prisma.oneTimeUserProperty.create({
      data: {
        ...data,
      },
    });

    console.log("New property saved:", newProperty);

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
    data.paymentStatus = "Pending";
    data.status = "Pending";
    data.statusMessage = "Request is being processed";

    if (!data.reference) {
      data.reference = generateReference();
    }

    const newProperty = await prisma.property.create({
      data: {
        ...data,
      },
    });

    console.log("New property saved:", newProperty);

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

const updateTransactionStatus = async (
  reference: string,
  status: string,
  paymentStatus: string,
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

    // throw new Error("error");

    // Upload files to AWS S3

    console.warn("FORM DATA UPLOADING", "\n\n\n\n\n\n");

    console.log("formData", formData);

    console.error("\n\n\n\n\n\n", "FORM DATA UPLOADED");

    if (files && files.length > 0) {
      uploadedFilesUrls = await uploadToS3FromServer(files);
    }

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
      supportingDocumentsUrls: uploadedFilesUrls,
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
    });

    if (!paystackResponse || paystackResponse.status !== true) {
      // update the payment status in the database
      await updateTransactionStatus(
        result?.data?.reference!,
        "Failed",
        "Failed",
        paystackResponse.message,
        null
      );

      return { error: `${paystackResponse.message}`, status: 500 };
    }

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
    const user = await getAuthenticatedUser();

    if (!user) {
      return { error: "User is not authenticated.", status: 401 };
    }

    const email = user.email;
    const requester = user.firstName;

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

    // throw new Error("error");

    // Upload files to AWS S3

    console.warn("FORM DATA UPLOADING", "\n\n\n\n\n\n");

    console.log("formData", formData);

    console.error("\n\n\n\n\n\n", "FORM DATA UPLOADED");

    if (files && files.length > 0) {
      uploadedFilesUrls = await uploadToS3FromServer(files);
    }

    const data = {
      user: { connect: { id: user.id } }, // Assuming `email` is the unique identifier for the user
      // userId: user.id,
      address,
      lat: location?.lat,
      lng: location?.lng,
      lga,
      totalCost,
      comments,
      parcelId,
      supportingDocumentsUrls: uploadedFilesUrls,
    };

    const result = await saveToPropertyTable(data);

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
    });

    if (!paystackResponse || paystackResponse.status !== true) {
      // update the payment status in the database
      await updateTransactionStatus(
        result?.data?.reference!,
        "Failed",
        "Failed",
        paystackResponse.message,
        null
      );

      return { error: `${paystackResponse.message}`, status: 500 };
    }

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

export const paymentSuccessful = async (reference: string) => {
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
    if (existingTransaction.paymentStatus === "Successful") {
      console.log("Transaction already marked as successful:", reference);
      return {
        success: true,
        message: "Payment has already been recorded.",
        data: existingTransaction,
      };
    }

    // Verify the transaction with Paystack
    const verificationResponse = await verifyPaystackTransaction(reference);

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
        status: "Completed",
        paymentStatus: "Successful",
        statusMessage: "Payment completed successfully",
        error: null,
      },
    });

    console.log("Payment marked as successful:", updatedTransaction);
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
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, message: "User is not authenticated." };
    }

    // Fetch existing transaction from the database
    const existingTransaction = await prisma.property.findUnique({
      where: { reference, userId: user.id },
    });

    // If transaction does not exist, return an error
    if (!existingTransaction) {
      console.error("Transaction not found:", reference);
      return { success: false, message: "Transaction not found." };
    }

    // If payment is already marked as successful, avoid duplicate updates
    if (existingTransaction.paymentStatus === "Successful") {
      console.log("Transaction already marked as successful:", reference);
      return {
        success: true,
        message: "Payment has already been recorded.",
        data: { ...user, ...existingTransaction },
      };
    }

    // Verify the transaction with Paystack
    const verificationResponse = await verifyPaystackTransaction(reference);

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
        status: "Completed",
        paymentStatus: "Successful",
        statusMessage: "Payment completed successfully",
        error: null,
      },
    });

    console.log("Payment marked as successful:", updatedTransaction);
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

const getAllUserProperties = async (userId: string) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        user: {
          kindeId: userId,
        },
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
    const user = await getAuthenticatedUser();

    if (!user) {
      return { success: false, message: "User is not authenticated." };
    }

    const properties = await getAllUserProperties(user?.kindeId!);

    if (!properties || properties.length === 0) {
      return { success: false, message: "No properties found for this user." };
    }

    return { success: true, data: properties };
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
