import { Metadata, Viewport } from "next";
import { FC } from "react";
import ViewDetails from "./viewDetails";
import { getRequestByReference } from "../../actions/adminDbActions";
import InvalidReferencePage from "@/components/InvalidReferencePage";
import { authGetTransactionData } from "@/app/(projects)/reva/actions/dbActions";
import AdminSingleRequestPage from "./AdminSingleRequestPage";
import { AdminReportUpload } from "./AdminReportUpload";

const AdminMiniHeader = ({ title = "Admin Report Upload" }) => {
  return (
    <header className="mt-4 bg-gradient-to-r w-[90%] lg:w-1/2  from-gray-800 to-blue-500 text-white py-4 rounded-tl-3xl rounded-br-3xl">
      <div className="container mx-auto flex justify-between items-center px-6">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
    </header>
  );
};

const ViewDetailsPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const reference = searchParams?.reference;

  if (!reference) {
    console.error("Missing reference in URL.");
    return <InvalidReferencePage />; // Render a 404 page if the reference is missing
  }

  try {
    const request = await getRequestByReference(reference);
    const result = await authGetTransactionData(reference);

    if (request.success) {
      console.log("Request Data:", result);
      const transformedProperty = {
        ...result.data,
        report: result?.data?.report ?? undefined, // Ensure compatibility with expected type
        address: result?.data?.address ?? "Unknown Address", // Provide a default value for address
        lga: result?.data?.lga ?? "Unknown LGA", // Provide a default value for lga
      };

      return (
        <>
          <AdminMiniHeader title="User Request Data" />
          <AdminSingleRequestPage property={transformedProperty} />;
          <AdminMiniHeader title="Admin Report Upload" />
          <AdminReportUpload />;
        </>
      );
    } else {
      return <InvalidReferencePage />;
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    return <InvalidReferencePage />;
  }
};

export default ViewDetailsPage;
