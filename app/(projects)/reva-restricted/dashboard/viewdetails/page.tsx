import { Metadata, Viewport } from "next";
import { FC } from "react";
import ViewDetails from "./viewDetails";
import { getRequestByReferenceByAdmin } from "../../actions/adminDbActions";
import InvalidReferencePage from "@/components/InvalidReferencePage";
import UserRequestDataView from "./UserRequestDataView";
import { AdminReportUpload } from "./AdminReportUpload";
import { AdminDirectLinkUpload } from "./AdminDirectLinkUpload";
import { AdminMiniHeader } from "./AdminMiniHeader";
import AdminReport from "./AdminReport";
import SingleRequestPage from "@/app/(projects)/reva/dashboard/viewdetails/SingleRequestPage";

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

          <AdminReport property={transformedProperty} user={request.user} />

          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />

          <div className="user bg-slate-200 p-6">
            <AdminMiniHeader title="How it looks on User's Dashboard" />
            <SingleRequestPage property={transformedProperty} />
          </div>
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
