import { Metadata } from "next";
import { getSurveyorsForKyc } from "@/surfboard/services/qrEarningsService";
import { getAuthenticatedSurfUserFromCookie } from "@/surfboard/utils/surfAuth";
import { redirect } from "next/navigation";
import KycClient from "./KycClient";

export const metadata: Metadata = {
  title: "Surveyor's KYC - Admin Dashboard",
};

export default async function KycPage() {
  let user = null;
  try {
    user = await getAuthenticatedSurfUserFromCookie();
  } catch (e) {
    // Expected during prerendering when no cookies are available
  }
  
  if (!user || user.role !== "SUPERADMIN") {
    redirect("/surfboard-restricted/dashboard");
  }

  const surveyors = await getSurveyorsForKyc();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Surveyor's KYC
        </h1>
        <p className="text-gray-400">
          Review and validate surveyor accounts to grant them full access to CoD submissions.
        </p>
      </div>

      <KycClient initialSurveyors={surveyors} />
    </div>
  );
}
