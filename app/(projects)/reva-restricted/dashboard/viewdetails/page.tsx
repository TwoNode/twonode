import { Metadata, Viewport } from "next";
import { FC } from "react";
import ViewDetails from "./viewDetails";
import { getRequestByReferenceByAdmin } from "../../actions/adminDbActions";
import InvalidReferencePage from "@/components/InvalidReferencePage";
import UserRequestDataView from "./UserRequestDataView";
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
    const request = await getRequestByReferenceByAdmin(reference);

    if (request.success) {
      // console.log("Request Data:", result);
      const transformedProperty = {
        ...request.data,
        // report: result?.data?.report ?? undefined, // Ensure compatibility with expected type
      };

      return (
        <>
          <AdminMiniHeader title="User Request Data" />
          <UserRequestDataView property={transformedProperty} />
          <AdminMiniHeader title="Admin Report Upload" />
          <AdminReportUpload
            property={transformedProperty}
            user={request.user}
          />
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
