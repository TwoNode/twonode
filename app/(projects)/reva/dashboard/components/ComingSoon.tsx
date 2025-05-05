import Link from "next/link";
import React from "react";

export const ComingSoon = () => {
  return (
    <div className="flex items-center justify-center h-[80vh] max-h-screen bg-gradient-to-r from-blue-500 to-indigo-600">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Coming Soon</h1>
        <p className="text-gray-600 text-lg mb-6">
          We're working hard to bring you something amazing. Stay tuned!
        </p>
        <div className="flex justify-center">
          <Link href={"/reva/dashboard"} className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};
