"use client";

import React from "react";

const ErrorComponent = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-[47px_60px] max-xl:p-[30px_40px] max-lg:p-[15px_30px] max-sm:p-[10px_15px] max-md:p-[10px_20px] max-w-full bg-red-50 rounded-lg shadow-sm">
      <div className="text-center space-y-4">
        <svg
          className="w-16 h-16 mx-auto text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-xl font-semibold text-red-700">
          Unable to Load Requests
        </h3>
        <p className="text-red-600">
          We encountered an error while loading your requests.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200 ease-in-out"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
};

export default ErrorComponent;
