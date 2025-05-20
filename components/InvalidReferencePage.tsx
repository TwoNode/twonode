import React from "react";

const InvalidReferencePage = () => {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-slate-50 text-center px-4 font-sans">
      <h1 className="text-4xl md:text-5xl font-bold text-red-500 mb-2">
        Invalid Reference ID
      </h1>
      <p className="text-base md:text-lg text-gray-500 mb-6">
        The reference you're looking for doesn't exist or is unavailable.
      </p>
      <a
        href="/reva/dashboard/allrequests"
        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Go Back Home
      </a>
    </div>
  );
};

export default InvalidReferencePage;
