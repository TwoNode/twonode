import { Metadata, Viewport } from "next";
import { FC } from "react";
import VerifyPayment from "./viewDetails";
import { notFound } from "next/navigation"; // Handles error cases gracefully
import { getServerSession } from "@/lib/auth/session";
import { getUserContact } from "@/reva/services/propertyRequestService";
import { authPaymentSuccessful } from "@/reva/services/paymentService";
import { Platform } from "@/utils/platform";
import PaymentErrorPage from "./PaymentErrorPage";

const VerifyPaymentPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const { reference } = await searchParams;

  if (!reference) {
    console.error("Missing reference in URL.");
    return notFound(); // Render a 404 page if the reference is missing
  }

  const session = await getServerSession(Platform.REVA);
  if (!session) {
    return notFound();
  }

  try {
    const user = await getUserContact(session.sub);
    const data = await authPaymentSuccessful(
      reference,
      session.sub,
      user.email
    );
    return <VerifyPayment formData={data} />;
  } catch (error) {
    console.error("Error processing payment:", error);
    return (
      <PaymentErrorPage
        message={error instanceof Error ? error.message : ""}
        reference={reference}
      />
    );
  }
};

export default VerifyPaymentPage;
