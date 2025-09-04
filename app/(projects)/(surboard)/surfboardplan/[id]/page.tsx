import { getPublicSurfPlanByIdWithSurveyor } from "@/app/(projects)/(surboard)/actions/surfboardActions";
import { Metadata } from "next";
import { SurfPageNotFound } from "@/components/pageNotFound/SurfPageNotFound";
import PublicSurfboardPlan from "./PublicSurfPlan";

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getPublicSurfPlanByIdWithSurveyor(params.id);

  if (!res.success || !res.data) {
    return {
      title: "Plan Not Found | Surfboard Plans",
    };
  }

  const { planNumber, surveyTitle, lga, ward } = res.data;

  return {
    title: `Survey Plan ${planNumber} | ${surveyTitle}`,
    description: `Survey plan ${planNumber} for ${surveyTitle} in ${ward}, ${lga}.`,
    openGraph: {
      title: `Survey Plan ${planNumber} | ${surveyTitle}`,
      description: `View survey plan details for ${surveyTitle} in ${ward}, ${lga}.`,
      type: "website",
      url: `https://www.twonodetechnologies.com/surfboardplan/${params.id}`,
    },
  };
}

export default function PublicSurfboardPlanPage({
  params,
}: {
  params: { id: string };
}) {
  if (!params?.id) {
    return <SurfPageNotFound />;
  }

  return <PublicSurfboardPlan params={params} />;
}
