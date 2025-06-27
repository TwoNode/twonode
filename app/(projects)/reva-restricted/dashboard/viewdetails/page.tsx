import { Metadata, Viewport } from "next";
import { FC } from "react";
import ViewDetails from "./viewDetails";
import {
  getRequestByReferenceByAdmin,
  getOneTimeRequestByReferenceByAdmin,
} from "../../actions/adminDbActions";
import InvalidReferencePage from "@/components/InvalidReferencePage";
import UserRequestDataView from "./UserRequestDataView";
import { AdminReportUpload } from "./AdminReportUpload";
import { AdminDirectLinkUpload } from "./AdminDirectLinkUpload";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";
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
    // First try to get regular request
    let request = await getRequestByReferenceByAdmin(reference);
    let isOneTimeRequest = false;

    // If not found, try OneTime request
    if (!request.success) {
      const oneTimeRequest = await getOneTimeRequestByReferenceByAdmin(
        reference
      );
      if (oneTimeRequest.success) {
        request = oneTimeRequest as any;
        isOneTimeRequest = true;
      }
    }

    if (request?.success) {
      // console.log("Request Data:", result);
      const transformedProperty = {
        ...request.data,
        isOneTimeRequest, // Add flag to identify request type
        // report: result?.data?.report ?? undefined, // Ensure compatibility with expected type
      };

      return (
        <>
          <AdminMiniHeader
            title={
              isOneTimeRequest ? "OneTime Request Data" : "User Request Data"
            }
          />
          <UserRequestDataView property={transformedProperty} />

          <AdminReport property={transformedProperty} user={request?.user} />

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
            <AdminMiniHeader
              title={
                isOneTimeRequest
                  ? "How it looks on OneTime User's Page"
                  : "How it looks on User's Dashboard"
              }
            />
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
