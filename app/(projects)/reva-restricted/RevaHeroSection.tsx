import { RevaHeroSection } from "@/components/reva/shared";

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
