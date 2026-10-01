import { Metadata } from "next";
import { getSurveyorsForKyc } from "@/surfboard/services/qrEarningsService";
import { getEffectiveUserData } from "@/lib/auth/session";
import { canAccessSurfAdminPanel } from "@/permissions";
import { Platform } from "@/utils/platform";
import { redirect } from "next/navigation";
import KycClient from "./KycClient";

export const metadata: Metadata = {
  title: "Surveyor's KYC - Admin Dashboard",
};

export default async function KycPage() {
  const userData = await getEffectiveUserData(Platform.SURFBOARD);

  if (!userData || !canAccessSurfAdminPanel(userData.role)) {
    redirect("/surfboard-restricted/dashboard");
  }

  const surveyors = await getSurveyorsForKyc();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
          Surveyor's KYC
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Review and validate surveyor accounts to grant them full access to CoD submissions.
        </p>
      </div>

      <KycClient initialSurveyors={surveyors} />
    </div>
  );
}
