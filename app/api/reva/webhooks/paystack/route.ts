import crypto from "crypto";
import { NextRequest } from "next/server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || "";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    return new Response(JSON.stringify({ message: "Missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
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
      case "charge.success":
        console.log("Payment successful:", body.data);
        break;

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
