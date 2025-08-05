import { Metadata, Viewport } from "next";
import { FC } from "react";
import VerifyPayment from "./viewDetails";
import { notFound } from "next/navigation"; // Handles error cases gracefully
import { authPaymentSuccessful } from "@/app/(projects)/reva/actions/revaActions";
import PaymentErrorPage from "./PaymentErrorPage";

const VerifyPaymentPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const reference = searchParams?.reference;

  if (!reference) {
    console.error("Missing reference in URL.");
    return notFound(); // Render a 404 page if the reference is missing
  }

  try {
    const paymentResult = await authPaymentSuccessful(reference);

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
