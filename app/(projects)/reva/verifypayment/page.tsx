import { Metadata, Viewport } from "next";
import { FC } from "react";
import VerifyPayment from "./viewDetails";
import { notFound } from "next/navigation";
import { checkPaymentSuccess } from "../actions/revaActions";
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
    const paymentResult = await checkPaymentSuccess(reference);

    if (paymentResult.success) {
      return <VerifyPayment formData={paymentResult?.data} />;
    } else {
      return (
        <PaymentErrorPage
          message={paymentResult?.message || ""}
          reference={reference}
        />
      );
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    return notFound();
  }
};

export default VerifyPaymentPage;
