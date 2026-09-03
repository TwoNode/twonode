import { getServerSession } from "@/lib/auth/session";
import { getUserProperties } from "@/reva/services/propertyRequestService";
import { Platform } from "@/utils/platform";
import RequestsMap from "./RequestsMap";

const ViewDetailsPage = async () => {
  const session = await getServerSession(Platform.REVA);
  const data = session ? await getUserProperties(session.sub) : [];

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <RequestsMap properties={data} />
    </div>
  );
};

export default ViewDetailsPage;
