import Image from "next/image";
import React from "react";

export const RevaFooterSection = () => {
  return (
    <>
      {/* Footer Section */}
      <footer className="py-10 bg-gray-900 text-white text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/reva/revaLogo.png"
            alt="REVA Logo"
            width={50}
            height={50}
            className="bg-white/90 rounded-full"
          />
        </div>
        <p className="text-lg">&copy; 2025 REVA. All rights reserved.</p>
      </footer>
    </>
  );
};
