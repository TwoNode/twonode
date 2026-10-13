import { Metadata } from "next";
import { FC } from "react";
import { getAnyRequestByReferenceForAdmin } from "@/reva/services/reportService";
import InvalidReferencePage from "@/components/InvalidReferencePage";
import UserRequestDataView from "./UserRequestDataView";
import { AdminMiniHeader } from "../../components/AdminMiniHeader";
import { RequestPageHeader } from "../../components/RequestPageHeader";
import AdminReport from "./AdminReport";
import { OneTimeRequestView } from "../components/OneTimeRequestView";
import { AdminReportUpload } from "./AdminReportUpload";
import { PDFDownloadButton } from "@/app/(projects)/(reva)/reva-restricted/dashboard/details/components/PDFDownloadButton";

const ViewDetailsPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const { reference } = await searchParams;

  if (!reference) {
    console.error("Missing reference in URL.");
    return <InvalidReferencePage />;
  }

  try {
    const request = await getAnyRequestByReferenceForAdmin(reference);
    const isOneTimeRequest = request.type === "oneTime";
    const user = request.type === "property" ? request.data.user : undefined;

    if (isOneTimeRequest) {
      const transformedProperty = {
        ...request.data,
        isOneTimeRequest,
      };

      return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
          <RequestPageHeader
            kind="One-time request"
            reference={transformedProperty.reference}
            actions={
              <>
                <PDFDownloadButton
                  property={transformedProperty}
                  type="receipt"
                />
                <PDFDownloadButton
                  property={transformedProperty}
                  type="report"
                />
              </>
            }
          />

          <div className="mt-6">
            <OneTimeRequestView request={transformedProperty as any} />
          </div>

          <div className="mt-8">
            <AdminReport property={transformedProperty} user={user} />
          </div>

          <div className="mt-8 bg-gray-50 dark:bg-surface p-6 rounded-lg">
            <AdminMiniHeader title="Admin Actions" />

            <div className="mt-4">
              <AdminReportUpload property={transformedProperty} user={user} />
            </div>
          </div>
        </div>
      );
    }

    const transformedProperty = {
      ...request.data,
      isOneTimeRequest,
    };

    return (
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        <RequestPageHeader
          kind="User request"
          reference={transformedProperty.reference}
          actions={
            <>
              <PDFDownloadButton
                property={transformedProperty}
                type="receipt"
              />
              <PDFDownloadButton property={transformedProperty} type="report" />
            </>
          }
        />

        <div className="mt-6">
          <UserRequestDataView property={transformedProperty} />
        </div>

        <div className="mt-8">
          <AdminReport property={transformedProperty} user={user} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error processing reference:", error);
    return <InvalidReferencePage />;
  }
};

export default ViewDetailsPage;
