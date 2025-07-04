import { Metadata, Viewport } from "next";
import { FC } from "react";
import VerifyPayment from "./viewDetails";
import { notFound } from "next/navigation";
import { checkPaymentSuccess } from "../actions/dbActions";

const VerifyPaymentPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const reference = searchParams?.reference;

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
        <div className="flex justify-center items-center h-screen">
          <div className="p-6 bg-red-500 text-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold">Payment Verification Failed</h2>
            <p>
              {paymentResult?.message! ||
                "Something went wrong. Please try again!"}
            </p>
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    return notFound();
  }
};

export default VerifyPaymentPage;
