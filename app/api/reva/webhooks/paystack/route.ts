import crypto from "node:crypto";
import { NextRequest } from "next/server";
import type { PaystackWebhookType } from "@/types/PaystackWebhookType";
import { PrismaClient } from "@prisma/client";
import { getPaystackSecretForWebhook } from "@/utils/paystackConfig";

const prisma = new PrismaClient();

// Helper to mark payment as paid
async function markPaymentPaid(reference: string, message: string) {
  console.log("markPaymentPaid called with reference:", reference);
  let updated = null;
  if (reference.startsWith("REVA_")) {
    console.log("Updating property table for authenticated user");
    // Update property table for authenticated users
    try {
      updated = await prisma.property.update({
        where: { reference },
        data: {
          paymentStatus: "Paid",
          status: "Processing",
          statusMessage: message || "Payment completed successfully",
          error: null,
        },
      });
      console.log("Successfully updated property table:", updated.id);
      return { success: true, data: updated, type: "property" };
    } catch (e) {
      console.error("Error updating property table:", e);
      return { success: false, error: "Reference not found in property table" };
    }
  } else if (reference.startsWith("reva_")) {
    console.log("Updating oneTimeUserProperty table for one-time user");
    // Update oneTimeUserProperty table for one-time users
    try {
      updated = await prisma.oneTimeUserProperty.update({
        where: { reference },
        data: {
          paymentStatus: "Paid",
          status: "Processing",
          statusMessage: message || "Payment completed successfully",
          error: null,
        },
      });
      console.log(
        "Successfully updated oneTimeUserProperty table:",
        updated.id
      );
      return { success: true, data: updated, type: "oneTimeUserProperty" };
    } catch (e) {
      console.error("Error updating oneTimeUserProperty table:", e);
      return {
        success: false,
        error: "Reference not found in oneTimeUserProperty table",
      };
    }
  } else {
    console.log("Invalid reference format:", reference);
    return { success: false, error: "Invalid reference format" };
  }
}

// Helper to mark payment as failed/unpaid
async function markPaymentFailed(reference: string, message: string) {
  console.log("markPaymentFailed called with reference:", reference);
  let updated = null;
  if (reference.startsWith("REVA_")) {
    console.log("Updating property table for authenticated user (failed)");
    // Update property table for authenticated users
    try {
      updated = await prisma.property.update({
        where: { reference },
        data: {
          paymentStatus: "Unpaid",
          status: "Processing",
          statusMessage: message || "Payment failed",
          error: message,
        },
      });
      console.log("Successfully updated property table (failed):", updated.id);
      return { success: true, data: updated, type: "property" };
    } catch (e) {
      console.error("Error updating property table (failed):", e);
      return { success: false, error: "Reference not found in property table" };
    }
  } else if (reference.startsWith("reva_")) {
    console.log(
      "Updating oneTimeUserProperty table for one-time user (failed)"
    );
    // Update oneTimeUserProperty table for one-time users
    try {
      updated = await prisma.oneTimeUserProperty.update({
        where: { reference },
        data: {
          paymentStatus: "Unpaid",
          status: "Processing",
          statusMessage: message || "Payment failed",
          error: message,
        },
      });
      console.log(
        "Successfully updated oneTimeUserProperty table (failed):",
        updated.id
      );
      return { success: true, data: updated, type: "oneTimeUserProperty" };
    } catch (e) {
      console.error("Error updating oneTimeUserProperty table (failed):", e);
      return {
        success: false,
        error: "Reference not found in oneTimeUserProperty table",
      };
    }
  } else {
    console.log("Invalid reference format (failed):", reference);
    return { success: false, error: "Invalid reference format" };
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    console.log("Webhook: Missing signature");
    return new Response(JSON.stringify({ message: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as PaystackWebhookType;
  console.log("Webhook received:", {
    event: body.event,
    reference: body.data.reference,
    status: body.data.status,
    amount: body.data.amount,
    gateway_response: body.data.gateway_response,
  });

  // Get the appropriate Paystack secret key for webhook verification
  const PAYSTACK_SECRET = getPaystackSecretForWebhook();

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");

  if (hash !== signature) {
    console.log("Webhook: Invalid signature");
    return new Response(JSON.stringify({ message: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (body.event) {
      case "charge.success": {
        const reference = body.data.reference;
        console.log("Processing charge.success for reference:", reference);

        if (!reference) {
          console.log("Webhook: Missing reference in webhook data");
          return new Response(
            JSON.stringify({ message: "Missing reference in webhook data" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        if (body.data.status === "success") {
          console.log(
            "Payment successful, marking as paid for reference:",
            reference
          );
          const result = await markPaymentPaid(
            reference,
            body.data.gateway_response || "Payment completed successfully"
          );
          console.log("markPaymentPaid result:", result);

          if (result.success) {
            console.log("Successfully marked payment as paid:", result);
            return new Response(
              JSON.stringify({
                message: "Payment marked as paid",
                data: result.data,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          } else {
            console.log("Failed to mark payment as paid:", result.error);
            return new Response(
              JSON.stringify({
                message: "Failed to mark payment as paid",
                error: result.error,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        } else {
          console.log(
            "Payment failed, marking as failed for reference:",
            reference
          );
          const failResult = await markPaymentFailed(
            reference,
            body.data.gateway_response || "Payment failed"
          );
          console.log("markPaymentFailed result:", failResult);

          if (failResult.success) {
            console.log("Successfully marked payment as failed:", failResult);
            return new Response(
              JSON.stringify({
                message: "Payment marked as failed",
                data: failResult.data,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          } else {
            console.log("Failed to mark payment as failed:", failResult.error);
            return new Response(
              JSON.stringify({
                message: "Failed to mark payment as failed",
                error: failResult.error,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        }
      }
      case "charge.failed": {
        const reference = body.data.reference;
        console.log("Processing charge.failed for reference:", reference);
        const failResult = await markPaymentFailed(
          reference,
          body.data.gateway_response || "Payment failed"
        );
        console.log("markPaymentFailed result:", failResult);

        if (failResult.success) {
          return new Response(
            JSON.stringify({
              message: "Payment marked as failed",
              data: failResult.data,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } else {
          return new Response(
            JSON.stringify({
              message: "Failed to mark payment as failed",
              error: failResult.error,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
      case "subscription.create":
        console.log("Subscription created:", body.data);
        break;
      case "transfer.success":
        console.log("Transfer successful:", body.data);
        break;
      default:
        console.log("Unhandled event:", body.event);
    }

    return new Response(
      JSON.stringify({ message: "Webhook processed successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: "Invalid URL" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// {
//   "event": "charge.success",
//   "data": {
//     "id": 302961,
//     "domain": "live",
//     "status": "success",
//     "reference": "qTPrJoy9Bx",
//     "amount": 10000,
//     "message": null,
//     "gateway_response": "Approved by Financial Institution",
//     "paid_at": "2016-09-30T21:10:19.000Z",
//     "created_at": "2016-09-30T21:09:56.000Z",
//     "channel": "card",
//     "currency": "NGN",
//     "ip_address": "41.242.49.37",
//     "metadata": 0,
//     "log": {
//       "time_spent": 16,
//       "attempts": 1,
//       "authentication": "pin",
//       "errors": 0,
//       "success": false,
//       "mobile": false,
//       "input": [],
//       "channel": null,
//       "history": [
//         {
//           "type": "input",
//           "message": "Filled these fields: card number, card expiry, card cvv",
//           "time": 15
//         },
//         {
//           "type": "action",
//           "message": "Attempted to pay",
//           "time": 15
//         },
//         {
//           "type": "auth",
//           "message": "Authentication Required: pin",
//           "time": 16
//         }
//       ]
//     },
//     "fees": null,
//     "customer": {
//       "id": 68324,
//       "first_name": "BoJack",
//       "last_name": "Horseman",
//       "email": "bojack@horseman.com",
//       "customer_code": "CUS_qo38as2hpsgk2r0",
//       "phone": null,
//       "metadata": null,
//       "risk_action": "default"
//     },
//     "authorization": {
//       "authorization_code": "AUTH_f5rnfq9p",
//       "bin": "539999",
//       "last4": "8877",
//       "exp_month": "08",
//       "exp_year": "2020",
//       "card_type": "mastercard DEBIT",
//       "bank": "Guaranty Trust Bank",
//       "country_code": "NG",
//       "brand": "mastercard",
//       "account_name": "BoJack Horseman"
//     },
//     "plan": {}
//   }
// }
