import { ReactNode } from "react";

export const AdminMiniHeader = ({
  title = "Admin Report Upload",
}: {
  title?: string | ReactNode | null;
}) => {
  return (
    <header className="mt-2 bg-gradient-to-r w-[90%] lg:w-1/2  from-gray-800 to-blue-500 text-white py-4 rounded-tl-3xl rounded-br-3xl">
      <div className="container mx-auto flex justify-between items-center px-6">
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
    </header>
  );
};
