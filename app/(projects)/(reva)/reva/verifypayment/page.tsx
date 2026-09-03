import { Metadata, Viewport } from "next";
import { FC } from "react";
import VerifyPayment from "./viewDetails";
import { notFound } from "next/navigation";
import { checkPaymentSuccess } from "@/reva/services/paymentService";
import PaymentErrorPage from "./PaymentErrorPage";

const VerifyPaymentPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const { reference } = await searchParams;

  if (!reference) {
    console.error("Missing reference in URL.");
    return notFound();
  }

  try {
    const data = await checkPaymentSuccess(reference);
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
