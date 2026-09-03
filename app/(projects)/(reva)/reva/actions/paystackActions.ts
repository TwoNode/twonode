"use server";

import { getPaystackCallbackUrl } from "@/utils/addBaseUrl";
import {
  createPaystackInstance,
  logPaystackEnvironment,
} from "@/utils/paystackConfig";

export const initializePaystack = async ({
  email,
  amount,
  reference,
  requester = "",
  address = "",
  lga = "",
  comments = "",
  isAuthenticated = false,
  isLive = false,
}: {
  email: string;
  amount: number;
  reference: string;
  requester: string;
  address: string;
  lga: string;
  comments: string;
  isAuthenticated?: boolean;
  isLive?: boolean;
}) => {
  try {
    // Create Paystack instance with appropriate keys based on isLive
    const paystack = await createPaystackInstance(isLive);

    // Log environment information for debugging
    await logPaystackEnvironment(isLive);

    const response = await paystack.transaction.initialize({
      email,
      amount,
      reference,
      metadata: {
        platform: "reva", // Explicit platform identification
        requester, // Name of the requester
        address, // Property address
        lga, // Local Government Area (LGA)
        comments,
        isLive, // Track if this is a live or test transaction
        custom_fields: [
          {
            display_name: "Platform",
            variable_name: "platform",
            value: "reva",
          },
          {
            display_name: "Requester Name", // Display name for the requester
            variable_name: "requester", // Variable name for the requester
            value: requester, // Value of the requester
          },
          {
            display_name: "Property Address", // Display name for the property address
            variable_name: "address", // Variable name for the property address
            value: address, // Value of the property address
          },
          {
            display_name: "LGA", // Display name for the LGA
            variable_name: "lga", // Variable name for the LGA
            value: lga, // Value of the LGA
          },
          {
            display_name: "Comments", // Display name for the LGA
            variable_name: "comments", // Variable name for the LGA
            value: comments, // Value of the LGA
          },
          {
            display_name: "Environment", // Display name for the environment
            variable_name: "isLive", // Variable name for the environment
            value: isLive ? "Live" : "Test", // Value of the environment
          },
        ],
      },
      callback_url: getPaystackCallbackUrl(
        isAuthenticated
          ? "/reva/dashboard/verifypayment"
          : "/reva/verifypayment"
      ),
    });

    console.log(
      "Paystack callback URL:",
      getPaystackCallbackUrl(
        isAuthenticated
          ? "/reva/dashboard/verifypayment"
          : "/reva/verifypayment"
      )
    );

    return response;
  } catch (error) {
    console.error("Error initializing Paystack:", error);
    throw error;
  }
};

export const verifyPaystackTransaction = async (
  reference: string,
  isLive: boolean = false
) => {
  try {
    // Create Paystack instance with appropriate keys based on isLive
    const paystack = await createPaystackInstance(isLive);

    const response = await paystack.transaction.verify({ reference });
    return response;
  } catch (error) {
    console.error("Error verifying Paystack transaction:", error);
    throw error;
  }
};

// // Configuration object for Paystack payment integration
// const paystackConfig: PaystackButtonProps = {
//   email, // Email of the payer
//   amount: totalCost * 100, // Total cost converted to kobo (Paystack uses the smallest currency unit)
//   publicKey: paystackPublicKey, // Paystack public key
//   reference: `REVA_${refrence}`, // Unique reference for the transaction
//   metadata: {
//     requester, // Name of the requester
//     address, // Property address
//     lga, // Local Government Area (LGA)
//     custom_fields: [
//       {
//         display_name: "Requester Name", // Display name for the requester
//         variable_name: "requester", // Variable name for the requester
//         value: requester, // Value of the requester
//       },
//       {
//         display_name: "Property Address", // Display name for the property address
//         variable_name: "address", // Variable name for the property address
//         value: address, // Value of the property address
//       },
//       {
//         display_name: "LGA", // Display name for the LGA
//         variable_name: "lga", // Variable name for the LGA
//         value: lga, // Value of the LGA
//       },
//     ],
//   },
//   currency: "NGN", // Currency for the transaction (Nigerian Naira)
//   onSuccess: (response: any) => {
//     console.log(Date.now().toString()); // Log the current timestamp
//     alert(`Payment successful! Transaction ID: ${response.reference}`); // Notify the user of successful payment
//     // Handle successful payment here
//     console.log("Payment successful:", response); // Log the payment response
//     router.push("/reva/verifypayment"); // Navigate to the details view page
//   },
//   onClose: () => {
//     if (isWindowReady) alert("Transaction was not completed."); // Notify the user if the transaction was closed without completion
//   },
// };

// you can call this function anything
