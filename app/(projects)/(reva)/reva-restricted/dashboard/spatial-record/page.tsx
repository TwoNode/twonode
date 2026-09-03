import { getSecureHtml } from "@/reva/utils/secureHtml";
import SpatialRecordMap from "./SpatialRecordMap";
import { REVA_COLORS } from "@/reva/colors";

const SpatialRecord = async () => {
  const html = await getSecureHtml();

  if (!html) return <div>Not authorized or file not found.</div>;

  return (
    <div
      className="max-w-full max-h-fit min-w-full min-h-[85vh] p-4"
      style={{ backgroundColor: `${REVA_COLORS.primary.main}50` }}
    >
      <SpatialRecordMap html={html} />
    </div>
  );
};

export default SpatialRecord;
