import crypto from "crypto";
import { NextRequest } from "next/server";
import type { PaystackWebhookType } from "@/types/PaystackWebhookType";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Helper to mark payment as paid
async function markPaymentPaid(reference: string, message: string) {
  let updated = null;
  if (reference.startsWith("REVA_")) {
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
      return { success: true, data: updated, type: "property" };
    } catch (e) {
      return { success: false, error: "Reference not found in property table" };
    }
  } else if (reference.startsWith("reva_")) {
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
      return { success: true, data: updated, type: "oneTimeUserProperty" };
    } catch (e) {
      return {
        success: false,
        error: "Reference not found in oneTimeUserProperty table",
      };
    }
  } else {
    return { success: false, error: "Invalid reference format" };
  }
}

// Helper to mark payment as failed/unpaid
async function markPaymentFailed(reference: string, message: string) {
  let updated = null;
  if (reference.startsWith("REVA_")) {
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
      return { success: true, data: updated, type: "property" };
    } catch (e) {
      return { success: false, error: "Reference not found in property table" };
    }
  } else if (reference.startsWith("reva_")) {
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
      return { success: true, data: updated, type: "oneTimeUserProperty" };
    } catch (e) {
      return {
        success: false,
        error: "Reference not found in oneTimeUserProperty table",
      };
    }
  } else {
    return { success: false, error: "Invalid reference format" };
  }
}

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || "";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    return new Response(JSON.stringify({ message: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as PaystackWebhookType;
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");

  if (hash !== signature) {
    return new Response(JSON.stringify({ message: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (body.event) {
      case "charge.success": {
        const reference = body.data.reference;
        if (!reference) {
          return new Response(
            JSON.stringify({ message: "Missing reference in webhook data" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        if (body.data.status === "success") {
          const result = await markPaymentPaid(
            reference,
            body.data.gateway_response || "Payment completed successfully"
          );
          if (result.success) {
            return new Response(
              JSON.stringify({
                // message: "Payment marked as paid",
                // data: result.data,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          } else {
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
          const failResult = await markPaymentFailed(
            reference,
            body.data.gateway_response || "Payment failed"
          );
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
      }
      // Optionally handle explicit failure event if Paystack sends it
      case "charge.failed": {
        const reference = body.data.reference;
        const failResult = await markPaymentFailed(
          reference,
          body.data.gateway_response || "Payment failed"
        );
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
