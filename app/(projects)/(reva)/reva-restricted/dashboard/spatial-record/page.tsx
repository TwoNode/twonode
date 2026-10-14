import { ComingSoon } from "@/reva/components/shared/ComingSoon";

const SpatialRecord = () => (
  <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
    <ComingSoon
      dashboardType="admin"
      customDescription="The spatial record map is being rebuilt. Check back soon."
    />
  </div>
);

export default SpatialRecord;
