"use server";

// import { OneTimeUserPropertyModel } from "@/models/PaymentModel";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { uploadToS3, uploadToS3FromServer } from "./awsActions";
import { initializePaystack } from "./paystackActions";
import { PrismaClient } from "@/prisma/models/prisma";

// const { revalidatePath } = require("next/cache");
// const { redirect } = require("next/navigation");
// const { NextResponse } = require("next/server");
// const { cookies } = require("next/headers");
// const { headers } = require("next/headers");
// const { NextRequest } = require("next/server");
// const { NextApiRequest } = require("next/server");
// const { NextApiResponse } = require("next/server");

// export const handleRevaRequest = async (formData: FormData) => {
//   // Extract the form data
//   const formDataObj = Object.fromEntries(formData.entries());
//   const {
//     firstName,
//     lastName,
//     email,
//     phone,
//     address,
//     city,
//     state,
//     zipCode,
//     country,
//     propertyType,
//     propertyAddress,
//     propertyCity,
//     propertyState,
//     propertyZipCode,
//     propertyCountry,
//   } = formDataObj;

//   // Create the request body
//   const requestBody = {
//     firstName,
//     lastName,
//     email,
//     phone,
//     address: {
//       street: address,
//       city,
//       state,
//       zipCode,
//       country,
//     },
//     property: {
//       type: propertyType,
//       address: {
//         street: propertyAddress,
//         city: propertyCity,
//         state: propertyState,
//         zipCode: propertyZipCode,
//         country: propertyCountry,
//       },
//     },
//   };

//   await OneTimeUserPropertyModel.create({
//     reference: `${Date.now()}-${Math.random()}`,
//     requester: `${firstName} ${lastName}`,
//     description: `Request from ${firstName} ${lastName}`,
//     status: "Pending",
//     statusMessage: "Request is being processed",
//     error: null,
//     userName: `${firstName} ${lastName}`,
//     email: email,
//     userPhoneNumber: phone,
//     address: propertyAddress,
//     location: null, // Assuming location is not provided in the form
//     lga: propertyCity,
//     totalCost: 0, // Assuming total cost is not provided in the form
//     supportingDocumentsUrls: [], // Assuming no supporting documents are uploaded
//   });

//   // Return the request body for further processing
//   return requestBody;
// };

export const saveToDatabase = async (data: any) => {
  const prisma = new PrismaClient();

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
  } finally {
    await prisma.$disconnect();
  }
};

const updateTransactionStatus = async (
  reference: string,
  status: string,
  paymentStatus: string,
  statusMessage: string,
  error: string | null
) => {
  const prisma = new PrismaClient();
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
    console.log("Transaction status updated:", updatedTransaction);
    return updatedTransaction;
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
};

export const saveFormDataAndInitiatePaystack = async (formData: any) => {
  try {
    const {
      email,
      requester,
      address,
      location,
      lga,
      totalCost,
      files,
      comments,
      parcelId,
    } = formData;

    // Upload files to AWS S3
    let uploadedFilesUrls: string[] = [];
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

    const result = await saveToDatabase(data);

    console.log("Result from saveToDatabase:", result);

    if (!result.success) {
      return { error: "Failed to save data", status: 500 };
    }

    // Optionally, you can initiate Paystack payment here
    const paystackResponse: any = await initializePaystack({
      email,
      amount: totalCost,
      reference: result?.data?.reference!,
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

    await updateTransactionStatus(
      result?.data?.reference!,
      "Processing",
      "Successful",
      "Payment is pending",
      null
    );

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
    return { error: "Internal Server Error", status: 500 };
  }
};
