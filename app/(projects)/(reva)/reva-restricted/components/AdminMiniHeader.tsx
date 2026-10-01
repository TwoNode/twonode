import { ReactNode } from "react";
import { REVA_GRADIENTS } from "@/reva/colors";

export const AdminMiniHeader = ({
  title = "Admin Report Upload",
}: {
  title?: string | ReactNode | null;
}) => {
  return (
    <header
      className="mt-2 w-[90%] lg:w-1/2 text-white py-4 rounded-tl-3xl rounded-br-3xl"
      style={{ background: REVA_GRADIENTS.header }}
    >
      <div className="container mx-auto flex justify-between items-center px-6">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
    </header>
  );
};
