import { getUserProperties } from "@/app/(projects)/reva/actions/dbActions";
import RequestsMap from "./RequestsMap";

const ViewDetailsPage = async ({
  searchParams,
}: {
  searchParams: { reference?: string };
}) => {
  const { data, success } = await getUserProperties();

  console.log("\n\n\n\n\n\n", success, data, "\n\n\n\n\n\n\n");

  return (
    <div className="flex flex-col p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full">
      <RequestsMap properties={data ?? []} />
    </div>
  );
};

export default ViewDetailsPage;
