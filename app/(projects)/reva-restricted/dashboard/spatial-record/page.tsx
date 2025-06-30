import { getSecureHtml } from "../../actions/otherActions";
import SpatialRecordMap from "./SpatialRecordMap";

const SpatialRecord = async () => {
  const html = await getSecureHtml();

  if (!html) return <div>Not authorized or file not found.</div>;

  return (
    <div className="bg-[#0a162b50] max-w-full max-h-fit min-w-full min-h-[85vh] p-4">
      <SpatialRecordMap html={html} />
    </div>
  );
};

export default SpatialRecord;
