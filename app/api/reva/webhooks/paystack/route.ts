import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { PaystackWebhookType } from "@/types/PaystackWebhookType";
import { NextRequest } from "next/server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || "";

export async function POST(
  req: NextRequest & { url: string },
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const signature = req.headers.get("x-paystack-signature") as string;

  if (!signature) {
    return res.status(400).json({ message: "Missing signature" });
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  const body: PaystackWebhookType | any = req.body;

  try {
    // Handle the event
    switch (body.event) {
      case "charge.success":
        // Process successful payment
        console.log("Payment successful:", body.data);
        // Update database payment status with body.data.reference
        // You can use a database library like mongoose or prisma to update the payment status
        // For example:
        // await PaymentModel.updateOne(
        //   { reference: body.data.reference },
        //   { status: "success" }
        // );

        // Send confirmation email or notification to user
        // await sendConfirmationEmail(body.data.customer.email, body.data);
        // You can use a library like nodemailer or sendgrid to send emails
        // For example:
        // await sendgrid.send({
        //   to: body.data.customer.email,
        break;

      case "subscription.create":
        // Handle subscription creation
        console.log("Subscription created:", body.data);
        break;

      case "transfer.success":
        // Handle successful transfer
        console.log("Transfer successful:", body.data);
        break;

      default:
        console.log("Unhandled event:", body.event);
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
