import { Metadata } from "next";
import { FC } from "react";
import {
  getRequestByReferenceByAdmin,
  getOneTimeRequestByReferenceByAdmin,
} from "../../actions/adminDbActions";
import InvalidReferencePage from "@/components/InvalidReferencePage";
import UserRequestDataView from "./UserRequestDataView";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";
import AdminReport from "./AdminReport";
import { OneTimeRequestView } from "../components/OneTimeRequestView";
import { AdminReportUpload } from "./AdminReportUpload";

const ViewDetailsPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const reference = searchParams?.reference;

  if (!reference) {
    console.error("Missing reference in URL.");
    return <InvalidReferencePage />;
  }

  try {
    let request = await getRequestByReferenceByAdmin(reference);
    let isOneTimeRequest = false;

    if (!request.success) {
      const oneTimeRequest = await getOneTimeRequestByReferenceByAdmin(
        reference
      );

      if (oneTimeRequest.success) {
        request = oneTimeRequest as any;
        isOneTimeRequest = true;
      }
    }

    console.log(
      "\n\n\n\n\n\nRequest: ",
      request,
      isOneTimeRequest,
      "\n\n\n\n\n\n"
    );

    if (isOneTimeRequest) {
      const transformedProperty = {
        ...request.data,
        isOneTimeRequest,
      };

      return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
          <AdminMiniHeader title="One-Time Request Details" />
          <div>{JSON.stringify(transformedProperty)}</div>

          <div className="mt-6">
            <OneTimeRequestView request={transformedProperty as any} />
          </div>

          <div className="mt-8">
            <AdminReport property={transformedProperty} user={request?.user} />
          </div>

          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <AdminMiniHeader title="Admin Actions" />

            <div className="mt-4">
              <AdminReportUpload
                property={transformedProperty}
                user={request?.user}
              />
            </div>
          </div>
        </div>
      );
    }

    if (request?.success) {
      const transformedProperty = {
        ...request.data,
        isOneTimeRequest,
      };

      return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
          <AdminMiniHeader title="User Request Details" />
          <div>{JSON.stringify(transformedProperty)}</div>

          <div className="mt-6">
            <UserRequestDataView property={transformedProperty} />
          </div>

          <div className="mt-8">
            <AdminReport property={transformedProperty} user={request?.user} />
          </div>
        </div>
      );
    } else {
      return <InvalidReferencePage />;
    }
  } catch (error) {
    console.error("Error processing reference:", error);
    return <InvalidReferencePage />;
  }
};

export default ViewDetailsPage;
