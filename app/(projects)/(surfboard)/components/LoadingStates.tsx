"use client";

import { FileText, Loader2 } from "lucide-react";

export function PlanDetailsLoadingState() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="animate-pulse bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded-lg w-3/4 animate-shimmer"></div>
            <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/2 animate-shimmer"></div>
          </div>
          <div className="h-8 w-24 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded-full animate-shimmer"></div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 w-24 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-shimmer"
            ></div>
          ))}
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-white dark:bg-surface rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm"
          >
            <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/2 mb-4 animate-shimmer"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded animate-shimmer"></div>
              <div className="h-8 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-20 animate-shimmer"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Sections Skeleton */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-white dark:bg-surface rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm"
          >
            <div className="h-6 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded w-1/4 mb-4 animate-shimmer"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="space-y-2">
                  <div className="h-3 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/3 animate-shimmer"></div>
                  <div className="h-4 bg-linear-to-r from-gray-100 via-gray-50 to-gray-100 rounded w-full animate-shimmer"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Loading Indicator */}
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 animate-pulse">
            Loading plan details...
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Please wait while we fetch the data
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}

export function PlanFormLoadingState() {
  return (
    <div className="space-y-6 p-6">
      {/* Form Header Skeleton */}
      <div className="animate-pulse bg-linear-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
        <div className="h-8 bg-linear-to-r from-indigo-200 via-indigo-100 to-indigo-200 rounded w-1/3 mb-2 animate-shimmer"></div>
        <div className="h-4 bg-linear-to-r from-indigo-100 via-indigo-50 to-indigo-100 rounded w-1/2 animate-shimmer"></div>
      </div>

      {/* Form Sections Skeleton */}
      <div className="space-y-6">
        {/* Basic Information Card */}
        <div className="animate-pulse bg-white dark:bg-surface rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="h-6 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded w-1/4 mb-6 animate-shimmer"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/3 animate-shimmer"></div>
                <div className="h-10 bg-linear-to-r from-gray-100 via-gray-50 to-gray-100 rounded animate-shimmer"></div>
              </div>
            ))}
          </div>
        </div>

        {/* File Upload Card */}
        <div className="animate-pulse bg-white dark:bg-surface rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="h-6 bg-linear-to-r from-blue-200 via-blue-100 to-blue-200 rounded w-1/4 mb-6 animate-shimmer"></div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/4 animate-shimmer"></div>
                <div className="h-10 bg-linear-to-r from-gray-100 via-gray-50 to-gray-100 rounded animate-shimmer"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Map Card */}
        <div className="animate-pulse bg-white dark:bg-surface rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="h-6 bg-linear-to-r from-emerald-200 via-emerald-100 to-emerald-200 rounded w-1/4 mb-4 animate-shimmer"></div>
          <div className="h-96 bg-linear-to-br from-gray-100 via-gray-50 to-gray-100 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer-slow"></div>
          </div>
        </div>
      </div>

      {/* Loading Indicator with Text */}
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 animate-pulse">
            Loading form data...
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Please wait while we prepare the form
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes shimmer-slow {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        .animate-shimmer-slow {
          animation: shimmer-slow 3s infinite linear;
        }
      `}</style>
    </div>
  );
}

export function GenericLoadingSpinner({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>
    </div>
  );
}
