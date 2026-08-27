import { Metadata, Viewport } from "next";
import { FC } from "react";
import SingleRequestPage from "./SingleRequestPage";
import { notFound } from "next/navigation"; // Handles error cases gracefully
import {
  authGetTransactionData,
  authPaymentSuccessful,
} from "@/app/(projects)/reva/actions/revaActions";
import InvalidReferencePage from "@/components/InvalidReferencePage";

const ViewDetailsPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const { reference } = await searchParams;

  if (!reference) {
    console.error("Missing reference in URL.");
    return <InvalidReferencePage />; // Render a 404 page if the reference is missing
  }

  try {
    const result = await authGetTransactionData(reference);

    console.log(result);

    if (!result?.data) {
      console.error("Invalid or missing property data.");
      return <InvalidReferencePage />;
    }

    const transformedProperty = {
      ...result.data,
      report: result.data.report ?? undefined, // Ensure compatibility with expected type
    };

    return <SingleRequestPage property={transformedProperty} />;
  } catch (error) {
    console.error("Error processing payment:", error);
    return <InvalidReferencePage />;
  }
};

export default ViewDetailsPage;
