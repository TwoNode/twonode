import { RevaHeroSection } from "@/reva/components/shared";

export default function AdminRevaHeroSection(props: any) {
  return (
    <RevaHeroSection
      {...props}
      dashboardType="admin"
      customButtonText="Go to Dashboard"
      customButtonLink="/reva-restricted/dashboard"
    />
  );
}
